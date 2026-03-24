"""Daily drawdown tracker for APEX Trading System."""
import asyncio
from datetime import datetime, date, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Hard limit: never AI-changeable
MAX_DAILY_LOSS_PCT = 0.08  # 8% of total equity


class DailyDrawdownTracker:
    """
    Tracks intraday P&L and blocks new trades when ceiling is breached.
    Resets at midnight UTC.
    """

    def __init__(self, max_daily_loss_pct: float = MAX_DAILY_LOSS_PCT):
        self._max_pct = max_daily_loss_pct  # stored but ceiling is hardcoded
        self._daily_pnl: float = 0.0
        self._trade_count: int = 0
        self._current_date: date = date.today()
        self._blocked: bool = False

    def _check_date_rollover(self) -> None:
        today = datetime.now(timezone.utc).date()
        if today != self._current_date:
            logger.info(f"[Drawdown] Day rollover. Resetting tracker for {today}")
            self._daily_pnl = 0.0
            self._trade_count = 0
            self._blocked = False
            self._current_date = today

    def record_pnl(self, pnl: float, equity: float) -> None:
        """Record a realized P&L event and check ceiling."""
        self._check_date_rollover()
        self._daily_pnl += pnl
        self._trade_count += 1

        daily_loss_pct = -self._daily_pnl / equity if equity > 0 else 0
        # Use hardcoded MAX_DAILY_LOSS_PCT, not self._max_pct
        if daily_loss_pct >= MAX_DAILY_LOSS_PCT and not self._blocked:
            self._blocked = True
            logger.warning(
                f"[Drawdown] CEILING BREACHED: daily_loss={daily_loss_pct:.2%} >= {MAX_DAILY_LOSS_PCT:.2%}. "
                f"All new trades BLOCKED."
            )

    def is_blocked(self, equity: float) -> bool:
        """Return True if daily drawdown ceiling has been hit."""
        self._check_date_rollover()
        if self._blocked:
            return True
        # Re-check in case pnl was updated externally
        if equity > 0:
            loss_pct = -self._daily_pnl / equity
            if loss_pct >= MAX_DAILY_LOSS_PCT:
                self._blocked = True
                return True
        return False

    def get_remaining_loss_budget(self, equity: float) -> float:
        """Return how much more we can lose today in EUR."""
        self._check_date_rollover()
        max_loss = equity * MAX_DAILY_LOSS_PCT
        used = max(0.0, -self._daily_pnl)
        return max(0.0, max_loss - used)

    @property
    def daily_pnl(self) -> float:
        return self._daily_pnl

    @property
    def trade_count(self) -> int:
        return self._trade_count

    def status_dict(self) -> dict:
        return {
            "daily_pnl": self._daily_pnl,
            "trade_count": self._trade_count,
            "blocked": self._blocked,
            "date": self._current_date.isoformat(),
            "max_daily_loss_pct": MAX_DAILY_LOSS_PCT,
        }
