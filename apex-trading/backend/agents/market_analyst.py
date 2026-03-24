"""Market Analyst Agent — Technical Analysis, no LLM."""
import os
import sys
import json
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from collections import defaultdict, deque
from typing import Optional

import pandas as pd
import pandas_ta as ta
import numpy as np

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import get_db, log_agent, is_system_paused
from connectors.hyperliquid import HyperliquidConnector

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"market_analyst","level":"%(levelname)s","msg":"%(message)s"}'
)
logger = logging.getLogger(__name__)

AGENT_NAME = "market_analyst"
MIN_CANDLES = 30  # minimum data points before generating signals
BUFFER_SIZE = 200  # rolling price buffer per asset
CONFIDENCE_THRESHOLD = float(os.getenv("SIGNAL_CONFIDENCE_THRESHOLD", "0.65"))


class MarketAnalyst:
    def __init__(self, hl_connector: HyperliquidConnector):
        self.hl = hl_connector
        # deque of (timestamp, price, volume) per asset
        self._buffers: dict[str, deque] = defaultdict(lambda: deque(maxlen=BUFFER_SIZE))
        self._last_signal_time: dict[str, float] = {}
        self._cooldown_sec = 15 * 60  # 15 minutes between signals per asset

    async def on_price_update(self, prices: dict[str, float]) -> None:
        """Called on every WebSocket price tick."""
        now = datetime.now(timezone.utc).timestamp()
        for asset, price in prices.items():
            self._buffers[asset].append((now, price, 0.0))  # volume placeholder
        # Run analysis on top assets
        await self._analyze_top_assets(prices)

    async def _analyze_top_assets(self, prices: dict[str, float]) -> None:
        """Analyze assets with most data and generate signals."""
        top_assets = self._get_top_movers(prices)
        for asset in top_assets[:5]:  # analyze top 5
            if len(self._buffers[asset]) < MIN_CANDLES:
                continue
            await self._analyze_asset(asset)

    def _get_top_movers(self, prices: dict[str, float]) -> list[str]:
        """Rank assets by recent price momentum."""
        movers = []
        for asset, buf in self._buffers.items():
            if len(buf) < 10:
                continue
            recent_prices = [b[1] for b in list(buf)[-10:]]
            change = abs(recent_prices[-1] - recent_prices[0]) / recent_prices[0] if recent_prices[0] else 0
            movers.append((asset, change))
        movers.sort(key=lambda x: x[1], reverse=True)
        return [a for a, _ in movers]

    def _compute_indicators(self, asset: str) -> Optional[dict]:
        """Compute RSI, MACD, Bollinger Bands, ATR for an asset."""
        buf = list(self._buffers[asset])
        if len(buf) < MIN_CANDLES:
            return None

        prices = pd.Series([b[1] for b in buf])

        try:
            rsi_series = ta.rsi(prices, length=14)
            rsi = float(rsi_series.iloc[-1]) if rsi_series is not None and not rsi_series.empty else 50.0

            macd_df = ta.macd(prices, fast=12, slow=26, signal=9)
            if macd_df is not None and not macd_df.empty:
                macd_val = float(macd_df.iloc[-1, 0])
                macd_signal = float(macd_df.iloc[-1, 2])
            else:
                macd_val, macd_signal = 0.0, 0.0

            bb_df = ta.bbands(prices, length=20)
            if bb_df is not None and not bb_df.empty:
                bb_upper = float(bb_df.iloc[-1, 0])
                bb_mid = float(bb_df.iloc[-1, 1])
                bb_lower = float(bb_df.iloc[-1, 2])
            else:
                bb_upper = bb_mid = bb_lower = float(prices.iloc[-1])

            atr_series = ta.atr(
                pd.Series([b[1] for b in buf]),  # using close as high/low approximation
                pd.Series([b[1] for b in buf]),
                prices,
                length=14
            )
            atr = float(atr_series.iloc[-1]) if atr_series is not None and not atr_series.empty else 0.0

            current_price = float(prices.iloc[-1])

            return {
                "price": current_price,
                "rsi": rsi,
                "macd": macd_val,
                "macd_signal": macd_signal,
                "bb_upper": bb_upper,
                "bb_mid": bb_mid,
                "bb_lower": bb_lower,
                "atr": atr,
                "bb_width": (bb_upper - bb_lower) / bb_mid if bb_mid else 0,
            }
        except Exception as e:
            logger.warning(f"Indicator calc error for {asset}: {e}")
            return None

    def _calculate_confidence(self, indicators: dict, side: str) -> float:
        """Score a signal from 0 to 1 based on indicator alignment."""
        score = 0.0
        weights = 0.0

        rsi = indicators["rsi"]
        macd = indicators["macd"]
        macd_signal = indicators["macd_signal"]
        price = indicators["price"]
        bb_upper = indicators["bb_upper"]
        bb_lower = indicators["bb_lower"]

        if side == "LONG":
            # RSI: oversold is bullish
            if rsi < 30:
                score += 1.0
            elif rsi < 40:
                score += 0.6
            elif rsi < 50:
                score += 0.3
            weights += 1.0

            # MACD bullish crossover
            if macd > macd_signal and macd > 0:
                score += 1.0
            elif macd > macd_signal:
                score += 0.5
            weights += 1.0

            # Price near lower Bollinger Band (mean reversion)
            if bb_lower > 0 and price <= bb_lower * 1.005:
                score += 1.0
            elif bb_lower > 0 and price <= bb_lower * 1.02:
                score += 0.5
            weights += 1.0

        else:  # SHORT
            if rsi > 70:
                score += 1.0
            elif rsi > 60:
                score += 0.6
            elif rsi > 55:
                score += 0.3
            weights += 1.0

            if macd < macd_signal and macd < 0:
                score += 1.0
            elif macd < macd_signal:
                score += 0.5
            weights += 1.0

            if bb_upper > 0 and price >= bb_upper * 0.995:
                score += 1.0
            elif bb_upper > 0 and price >= bb_upper * 0.98:
                score += 0.5
            weights += 1.0

        return score / weights if weights > 0 else 0.0

    def _detect_signal(self, asset: str, indicators: dict) -> Optional[dict]:
        """Determine if a tradeable signal exists."""
        price = indicators["price"]
        rsi = indicators["rsi"]
        macd = indicators["macd"]
        macd_signal_val = indicators["macd_signal"]

        # Check for cooldown
        now = datetime.now(timezone.utc).timestamp()
        last = self._last_signal_time.get(asset, 0)
        if now - last < self._cooldown_sec:
            return None

        long_conf = self._calculate_confidence(indicators, "LONG")
        short_conf = self._calculate_confidence(indicators, "SHORT")

        best_conf = max(long_conf, short_conf)
        if best_conf < CONFIDENCE_THRESHOLD:
            return None

        side = "LONG" if long_conf >= short_conf else "SHORT"
        self._last_signal_time[asset] = now

        return {
            "id": str(uuid.uuid4()),
            "asset": asset,
            "side": side,
            "confidence": round(best_conf, 4),
            "price": price,
            "indicators": indicators,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def _analyze_asset(self, asset: str) -> None:
        """Run full analysis pipeline and write signal to DB if found."""
        indicators = self._compute_indicators(asset)
        if not indicators:
            return

        signal = self._detect_signal(asset, indicators)
        if not signal:
            return

        logger.info(f"SIGNAL: {signal['side']} {asset} conf={signal['confidence']:.3f}")
        await log_agent(AGENT_NAME, "INFO", f"Signal generated: {signal['side']} {asset}", signal)

        async with await get_db() as db:
            await db.execute(
                """INSERT OR REPLACE INTO signals
                   (id, timestamp, asset, side, confidence, technical_data, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                (
                    signal["id"],
                    signal["timestamp"],
                    signal["asset"],
                    signal["side"],
                    signal["confidence"],
                    json.dumps(signal["indicators"]),
                ),
            )
            await db.commit()

    async def run(self) -> None:
        """Main loop: connect WebSocket and process price ticks."""
        logger.info("Market Analyst starting...")
        self.hl.add_price_callback(self.on_price_update)
        await self.hl.connect_websocket()


async def main():
    from dotenv import load_dotenv
    load_dotenv()
    from database.db import init_db
    await init_db()
    hl = HyperliquidConnector()
    analyst = MarketAnalyst(hl)
    await analyst.run()


if __name__ == "__main__":
    asyncio.run(main())
