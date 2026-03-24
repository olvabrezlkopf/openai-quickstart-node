"""Hyperliquid WebSocket + REST connector for APEX Trading System."""
import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Callable
import httpx
import websockets

logger = logging.getLogger(__name__)

TESTNET = os.getenv("HL_TESTNET", "true").lower() == "true"
PAPER_TRADING = os.getenv("PAPER_TRADING", "true").lower() == "true"

WS_URL = "wss://api.hyperliquid-testnet.xyz/ws" if TESTNET else "wss://api.hyperliquid.xyz/ws"
REST_URL = "https://api.hyperliquid-testnet.xyz" if TESTNET else "https://api.hyperliquid.xyz"


class HyperliquidConnector:
    """Handles all communication with Hyperliquid exchange."""

    def __init__(self):
        self.wallet_address = os.getenv("HL_API_WALLET_ADDRESS", "")
        self.private_key = os.getenv("HL_PRIVATE_KEY", "")
        self._price_callbacks: list[Callable] = []
        self._latest_prices: dict[str, float] = {}
        self._ws_running = False

    def add_price_callback(self, cb: Callable) -> None:
        """Register a callback to receive real-time price updates."""
        self._price_callbacks.append(cb)

    def get_latest_price(self, asset: str) -> Optional[float]:
        return self._latest_prices.get(asset)

    async def connect_websocket(self) -> None:
        """Connect to Hyperliquid WebSocket and subscribe to allMids."""
        self._ws_running = True
        logger.info(f"[HL] Connecting WebSocket ({'TESTNET' if TESTNET else 'MAINNET'})")
        while self._ws_running:
            try:
                async with websockets.connect(WS_URL, ping_interval=20) as ws:
                    await ws.send(json.dumps({
                        "method": "subscribe",
                        "subscription": {"type": "allMids"}
                    }))
                    logger.info("[HL] WebSocket subscribed to allMids")
                    async for raw in ws:
                        msg = json.loads(raw)
                        await self._handle_ws_message(msg)
            except Exception as e:
                logger.error(f"[HL] WebSocket error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def _handle_ws_message(self, msg: dict) -> None:
        if msg.get("channel") == "allMids":
            mids = msg.get("data", {}).get("mids", {})
            for asset, price_str in mids.items():
                try:
                    self._latest_prices[asset] = float(price_str)
                except (ValueError, TypeError):
                    pass
            for cb in self._price_callbacks:
                try:
                    await cb(self._latest_prices)
                except Exception as e:
                    logger.error(f"[HL] Price callback error: {e}")

    async def get_account_state(self) -> dict:
        """Fetch account equity and open positions via REST."""
        if PAPER_TRADING:
            return {
                "equity": 1000.0,
                "available_balance": 800.0,
                "positions": [],
                "paper_trading": True,
            }
        async with httpx.AsyncClient(base_url=REST_URL, timeout=10) as client:
            resp = await client.post("/info", json={
                "type": "clearinghouseState",
                "user": self.wallet_address
            })
            resp.raise_for_status()
            data = resp.json()
            equity = float(data.get("marginSummary", {}).get("accountValue", 0))
            positions = []
            for pos in data.get("assetPositions", []):
                p = pos.get("position", {})
                size = float(p.get("szi", 0))
                if size != 0:
                    positions.append({
                        "asset": p.get("coin", ""),
                        "side": "LONG" if size > 0 else "SHORT",
                        "size": abs(size),
                        "entry_price": float(p.get("entryPx", 0)),
                        "unrealized_pnl": float(p.get("unrealizedPnl", 0)),
                        "leverage": int(p.get("leverage", {}).get("value", 1)),
                    })
            return {
                "equity": equity,
                "available_balance": float(data.get("withdrawable", equity * 0.8)),
                "positions": positions,
            }

    async def get_open_positions(self) -> list[dict]:
        state = await self.get_account_state()
        return state.get("positions", [])

    async def place_order(
        self,
        asset: str,
        side: str,
        size: float,
        leverage: int,
        stop_loss_price: Optional[float] = None,
        take_profit_price: Optional[float] = None,
        order_type: str = "market",
    ) -> dict:
        """Place an order with native TP/SL orders on the exchange."""
        is_buy = side.upper() == "LONG"
        logger.info(
            f"[HL] {'PAPER ' if PAPER_TRADING else ''}ORDER: {side} {size} {asset} "
            f"lev={leverage}x SL={stop_loss_price} TP={take_profit_price}"
        )

        if PAPER_TRADING:
            fill_price = self._latest_prices.get(asset, 0.0)
            order_id = f"PAPER-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
            logger.info(f"[HL] Paper order filled at {fill_price} | id={order_id}")
            return {
                "status": "filled",
                "order_id": order_id,
                "fill_price": fill_price,
                "paper_trading": True,
            }

        # Real order via Hyperliquid SDK
        try:
            from hyperliquid.exchange import Exchange
            from hyperliquid.utils import constants
            from eth_account import Account

            acct = Account.from_key(self.private_key)
            base_url = constants.TESTNET_API_URL if TESTNET else constants.MAINNET_API_URL
            exchange = Exchange(acct, base_url)

            # Set leverage
            exchange.update_leverage(leverage, asset)

            # Place market order
            order_result = exchange.market_open(asset, is_buy, size)
            fill_price = float(order_result.get("response", {}).get("data", {}).get("statuses", [{}])[0].get("filled", {}).get("avgPx", 0))
            order_id = order_result.get("response", {}).get("data", {}).get("statuses", [{}])[0].get("filled", {}).get("oid", "")

            # Set exchange-native SL/TP
            if stop_loss_price:
                exchange.order(asset, not is_buy, size, stop_loss_price, {"trigger": {"triggerPx": stop_loss_price, "isMarket": True, "tpsl": "sl"}}, reduce_only=True)
            if take_profit_price:
                exchange.order(asset, not is_buy, size, take_profit_price, {"trigger": {"triggerPx": take_profit_price, "isMarket": True, "tpsl": "tp"}}, reduce_only=True)

            return {"status": "filled", "order_id": str(order_id), "fill_price": fill_price}
        except Exception as e:
            logger.error(f"[HL] Order placement failed: {e}")
            raise

    async def close_position(self, asset: str, side: str, size: float) -> dict:
        """Close an open position at market price."""
        is_buy = side.upper() == "SHORT"  # Close LONG = sell, Close SHORT = buy
        logger.info(f"[HL] {'PAPER ' if PAPER_TRADING else ''}CLOSE: {asset} {side} size={size}")

        if PAPER_TRADING:
            fill_price = self._latest_prices.get(asset, 0.0)
            return {"status": "closed", "fill_price": fill_price, "paper_trading": True}

        try:
            from hyperliquid.exchange import Exchange
            from hyperliquid.utils import constants
            from eth_account import Account

            acct = Account.from_key(self.private_key)
            base_url = constants.TESTNET_API_URL if TESTNET else constants.MAINNET_API_URL
            exchange = Exchange(acct, base_url)
            result = exchange.market_close(asset)
            return {"status": "closed", "result": result}
        except Exception as e:
            logger.error(f"[HL] Close position failed: {e}")
            raise

    async def close_all_positions(self) -> list[dict]:
        """Emergency: close every open position immediately."""
        positions = await self.get_open_positions()
        results = []
        for pos in positions:
            try:
                result = await self.close_position(pos["asset"], pos["side"], pos["size"])
                results.append({"asset": pos["asset"], "result": result})
                logger.warning(f"[HL] Emergency closed {pos['asset']}")
            except Exception as e:
                logger.error(f"[HL] Failed to close {pos['asset']}: {e}")
                results.append({"asset": pos["asset"], "error": str(e)})
        return results
