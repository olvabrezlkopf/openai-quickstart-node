"""Risk Manager Agent — Kelly Criterion + hardcoded safety limits."""
import os
import sys
import logging
from dataclasses import dataclass
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from risk.kelly import calculate_kelly, KellyResult
from risk.drawdown import DailyDrawdownTracker

logger = logging.getLogger(__name__)

# ============================================================
# HARD LIMITS — HARDCODED, NEVER CHANGEABLE BY AI OR CONFIG
# ============================================================
MAX_LEVERAGE = 5            # Phase 1
MAX_POSITIONS = 3
MAX_POSITION_PCT = 0.10     # 10% of total equity per position
MIN_CASH_RESERVE_PCT = 0.20 # 20% always liquid
MAX_DAILY_LOSS_PCT = 0.08   # 8% daily drawdown ceiling
# ============================================================


@dataclass
class RiskDecision:
    approved: bool
    position_size_eur: float
    leverage: int
    stop_loss_price: float
    take_profit_price: float
    kelly_fraction: float
    rejection_reason: Optional[str] = None


class RiskManager:
    """Synchronous risk evaluation for every trade decision."""

    def __init__(self):
        self.drawdown = DailyDrawdownTracker()

    def evaluate_trade(
        self,
        signal: dict,
        account_state: dict,
        recent_trades: list[dict],
        open_positions: list[dict],
        stop_loss_pct: float = 0.03,
        take_profit_ratio: float = 2.0,
    ) -> RiskDecision:
        """
        Evaluate whether a trade should be approved and with what size.

        Args:
            signal: Signal dict from Market Analyst (asset, side, confidence, price)
            account_state: {equity, available_balance, positions}
            recent_trades: Last N closed trades for Kelly calc
            open_positions: Currently open positions
            stop_loss_pct: Stop loss percentage from entry (default 3%)
            take_profit_ratio: R:R ratio (default 2.0)
        """
        equity = account_state.get("equity", 0.0)
        available = account_state.get("available_balance", 0.0)
        asset = signal.get("asset", "")
        side = signal.get("side", "LONG")
        entry_price = signal.get("price", 0.0)
        confidence = signal.get("confidence", 0.0)

        # Check 1: Drawdown ceiling
        if self.drawdown.is_blocked(equity):
            return RiskDecision(
                approved=False,
                position_size_eur=0,
                leverage=1,
                stop_loss_price=0,
                take_profit_price=0,
                kelly_fraction=0,
                rejection_reason="Daily drawdown ceiling breached — trading blocked until midnight UTC",
            )

        # Check 2: Maximum open positions
        if len(open_positions) >= MAX_POSITIONS:
            return RiskDecision(
                approved=False,
                position_size_eur=0,
                leverage=1,
                stop_loss_price=0,
                take_profit_price=0,
                kelly_fraction=0,
                rejection_reason=f"Max positions reached ({MAX_POSITIONS})",
            )

        # Check 3: Already have this asset
        for pos in open_positions:
            if pos.get("asset") == asset:
                return RiskDecision(
                    approved=False,
                    position_size_eur=0,
                    leverage=1,
                    stop_loss_price=0,
                    take_profit_price=0,
                    kelly_fraction=0,
                    rejection_reason=f"Already have open position in {asset}",
                )

        # Check 4: Cash reserve
        min_reserve = equity * MIN_CASH_RESERVE_PCT
        usable_balance = available - min_reserve
        if usable_balance <= 0:
            return RiskDecision(
                approved=False,
                position_size_eur=0,
                leverage=1,
                stop_loss_price=0,
                take_profit_price=0,
                kelly_fraction=0,
                rejection_reason=f"Insufficient balance after 20% cash reserve (equity={equity:.2f}, available={available:.2f})",
            )

        # Check 5: Calculate Kelly-based position size
        kelly_result = calculate_kelly(recent_trades)
        kelly_size = kelly_result.fraction * equity

        # Apply hard position cap
        max_position = equity * MAX_POSITION_PCT
        raw_size = min(kelly_size, max_position, usable_balance)

        if raw_size <= 0:
            return RiskDecision(
                approved=False,
                position_size_eur=0,
                leverage=1,
                stop_loss_price=0,
                take_profit_price=0,
                kelly_fraction=kelly_result.fraction,
                rejection_reason="Calculated position size is zero or negative",
            )

        # Check 6: Remaining loss budget
        loss_budget = self.drawdown.get_remaining_loss_budget(equity)
        # Max loss on this trade = size * stop_loss_pct
        max_trade_loss = raw_size * stop_loss_pct
        if max_trade_loss > loss_budget:
            raw_size = loss_budget / stop_loss_pct
            logger.info(f"[Risk] Position reduced to {raw_size:.2f} EUR to fit daily loss budget")

        if raw_size < 10.0:  # minimum viable trade size
            return RiskDecision(
                approved=False,
                position_size_eur=0,
                leverage=1,
                stop_loss_price=0,
                take_profit_price=0,
                kelly_fraction=kelly_result.fraction,
                rejection_reason=f"Position size too small: {raw_size:.2f} EUR",
            )

        # Calculate SL/TP prices
        if side == "LONG":
            stop_loss_price = round(entry_price * (1 - stop_loss_pct), 6)
            take_profit_price = round(entry_price * (1 + stop_loss_pct * take_profit_ratio), 6)
        else:
            stop_loss_price = round(entry_price * (1 + stop_loss_pct), 6)
            take_profit_price = round(entry_price * (1 - stop_loss_pct * take_profit_ratio), 6)

        logger.info(
            f"[Risk] APPROVED: {side} {asset} size={raw_size:.2f}EUR lev={MAX_LEVERAGE}x "
            f"SL={stop_loss_price} TP={take_profit_price} Kelly={kelly_result.fraction:.4f}"
        )

        return RiskDecision(
            approved=True,
            position_size_eur=round(raw_size, 2),
            leverage=MAX_LEVERAGE,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            kelly_fraction=kelly_result.fraction,
        )

    def record_trade_result(self, pnl: float, equity: float) -> None:
        """Update drawdown tracker after a trade closes."""
        self.drawdown.record_pnl(pnl, equity)
