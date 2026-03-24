"""Execution Agent — Deterministic order execution, no LLM."""
import os
import sys
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from dataclasses import asdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import get_db, log_agent, is_system_paused, get_open_trades
from connectors.hyperliquid import HyperliquidConnector
from agents.risk_manager import RiskDecision

logger = logging.getLogger(__name__)
AGENT_NAME = "execution_agent"
MONITOR_INTERVAL_SEC = 30


class ExecutionAgent:
    """Handles all trade execution and position monitoring."""

    def __init__(self, hl_connector: HyperliquidConnector):
        self.hl = hl_connector
        self._monitoring = False

    async def execute_trade(
        self,
        signal: dict,
        risk_decision: RiskDecision,
        debate_result: Optional[dict] = None,
    ) -> Optional[str]:
        """
        Execute a trade approved by Risk Manager and Team Leader.
        Returns trade ID if successful, None if failed.
        """
        if await is_system_paused():
            logger.warning("[Exec] System paused — skipping trade")
            return None

        asset = signal["asset"]
        side = signal["side"]
        price = signal["price"]
        size_eur = risk_decision.position_size_eur
        leverage = risk_decision.leverage
        sl = risk_decision.stop_loss_price
        tp = risk_decision.take_profit_price

        # Calculate contract size from EUR amount
        size_contracts = size_eur * leverage / price if price > 0 else 0
        if size_contracts <= 0:
            logger.error(f"[Exec] Invalid size: {size_contracts}")
            return None

        trade_id = str(uuid.uuid4())
        ts_open = datetime.now(timezone.utc).isoformat()

        logger.info(
            f"[Exec] Placing {side} {asset}: size={size_contracts:.4f} "
            f"lev={leverage}x entry≈{price} SL={sl} TP={tp}"
        )

        try:
            result = await self.hl.place_order(
                asset=asset,
                side=side,
                size=size_contracts,
                leverage=leverage,
                stop_loss_price=sl,
                take_profit_price=tp,
            )

            fill_price = result.get("fill_price", price)

            # Recalculate SL/TP based on actual fill
            if side == "LONG":
                actual_sl = round(fill_price * (1 - 0.03), 6)
                actual_tp = round(fill_price * (1 + 0.06), 6)
            else:
                actual_sl = round(fill_price * (1 + 0.03), 6)
                actual_tp = round(fill_price * (1 - 0.06), 6)

            async with await get_db() as db:
                await db.execute(
                    """INSERT INTO trades
                       (id, timestamp_open, asset, type, side, entry_price, size, leverage,
                        status, taxable, tax_paragraph, signal_confidence, debate_result,
                        kelly_fraction, position_size_eur)
                       VALUES (?, ?, ?, 'Perpetual', ?, ?, ?, ?, 'open', 1, '§23 EStG', ?, ?, ?, ?)""",
                    (
                        trade_id,
                        ts_open,
                        asset,
                        side,
                        fill_price,
                        size_contracts,
                        leverage,
                        signal.get("confidence", 0),
                        json.dumps(debate_result) if debate_result else None,
                        risk_decision.kelly_fraction,
                        size_eur,
                    ),
                )
                await db.commit()

            await log_agent(AGENT_NAME, "INFO", f"Trade opened: {side} {asset} @ {fill_price}", {
                "trade_id": trade_id,
                "asset": asset,
                "side": side,
                "fill_price": fill_price,
                "size": size_contracts,
                "leverage": leverage,
                "sl": actual_sl,
                "tp": actual_tp,
            })

            return trade_id

        except Exception as e:
            logger.error(f"[Exec] Order failed: {e}")
            await log_agent(AGENT_NAME, "ERROR", f"Order failed for {asset}: {e}")
            return None

    async def close_trade(
        self,
        trade_id: str,
        close_reason: str,
        exit_price: Optional[float] = None,
        equity: float = 0.0,
    ) -> bool:
        """Close a specific trade by ID."""
        async with await get_db() as db:
            rows = await db.execute_fetchall(
                "SELECT * FROM trades WHERE id = ? AND status = 'open'", (trade_id,)
            )
            if not rows:
                return False
            trade = dict(rows[0])

        asset = trade["asset"]
        side = trade["side"]
        size = trade["size"]
        entry_price = trade["entry_price"]

        try:
            result = await self.hl.close_position(asset, side, size)
            fill_price = exit_price or result.get("fill_price", 0.0)
        except Exception as e:
            logger.error(f"[Exec] Close failed for {trade_id}: {e}")
            return False

        # Calculate P&L
        if side == "LONG":
            pnl = (fill_price - entry_price) * size
        else:
            pnl = (entry_price - fill_price) * size

        ts_open = datetime.fromisoformat(trade["timestamp_open"])
        ts_close = datetime.now(timezone.utc)
        holding_hours = (ts_close - ts_open).total_seconds() / 3600

        # Estimate fees (0.05% taker)
        fees = size * fill_price * 0.0005 * 2  # open + close

        async with await get_db() as db:
            await db.execute(
                """UPDATE trades SET
                   timestamp_close=?, exit_price=?, pnl_eur=?, fees_eur=?,
                   holding_hours=?, status='closed', close_reason=?
                   WHERE id=?""",
                (ts_close.isoformat(), fill_price, round(pnl, 4), round(fees, 4),
                 round(holding_hours, 4), close_reason, trade_id),
            )
            await db.commit()

        logger.info(f"[Exec] Trade closed: {trade_id} reason={close_reason} pnl={pnl:.2f} EUR")
        await log_agent(AGENT_NAME, "INFO", f"Trade closed: {asset} pnl={pnl:.2f}", {
            "trade_id": trade_id, "pnl": pnl, "close_reason": close_reason
        })
        return True

    async def close_all_positions(self, reason: str = "kill_switch") -> list[dict]:
        """Emergency: close all open positions immediately."""
        logger.warning(f"[Exec] CLOSE ALL POSITIONS — reason: {reason}")
        await log_agent(AGENT_NAME, "WARNING", f"Closing all positions: {reason}")

        results = await self.hl.close_all_positions()
        open_trades = await get_open_trades()

        for trade in open_trades:
            await self.close_trade(trade["id"], reason)

        return results

    async def _update_trailing_stop(self, trade: dict, current_price: float) -> None:
        """Move stop-loss up as price moves in our favor."""
        side = trade["side"]
        entry_price = trade["entry_price"]
        trade_id = trade["id"]
        trail_pct = 0.025  # 2.5% trailing stop

        if side == "LONG":
            new_sl = round(current_price * (1 - trail_pct), 6)
            # Only move stop up, never down
            if new_sl > entry_price * 1.01:  # at least 1% above entry
                logger.debug(f"[Exec] Trailing SL for {trade['asset']}: new_sl={new_sl}")
        else:
            new_sl = round(current_price * (1 + trail_pct), 6)
            if new_sl < entry_price * 0.99:
                logger.debug(f"[Exec] Trailing SL for {trade['asset']}: new_sl={new_sl}")

    async def monitor_positions(self) -> None:
        """Continuously monitor open positions every 30s."""
        self._monitoring = True
        logger.info("[Exec] Position monitoring started")
        while self._monitoring:
            try:
                open_trades = await get_open_trades()
                positions = await self.hl.get_open_positions()
                prices = {p["asset"]: p.get("entry_price", 0) for p in positions}

                for trade in open_trades:
                    asset = trade["asset"]
                    current_price = self.hl.get_latest_price(asset) or prices.get(asset, 0)
                    if current_price > 0:
                        await self._update_trailing_stop(trade, current_price)

            except Exception as e:
                logger.error(f"[Exec] Monitor error: {e}")

            await asyncio.sleep(MONITOR_INTERVAL_SEC)

    async def run(self) -> None:
        """Start position monitoring loop."""
        await self.monitor_positions()
