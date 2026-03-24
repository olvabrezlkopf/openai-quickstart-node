"""Kelly Criterion calculator for position sizing."""
import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class KellyResult:
    fraction: float          # Kelly fraction (0-1)
    win_rate: float
    avg_win: float
    avg_loss: float
    rr_ratio: float
    sample_size: int
    capped: bool             # True if raw Kelly was > max_cap


MAX_KELLY_FRACTION = 0.25   # Never bet more than 25% even if Kelly says more
MIN_SAMPLE_SIZE = 10        # Need at least 10 trades for reliable estimate


def calculate_kelly(
    trades: list[dict],
    max_cap: float = MAX_KELLY_FRACTION,
) -> KellyResult:
    """
    Calculate Kelly fraction from a list of closed trades.

    Args:
        trades: List of trade dicts with 'pnl_eur' field (positive=win, negative=loss)
        max_cap: Maximum fraction to return (safety cap)

    Returns:
        KellyResult with fraction and supporting stats
    """
    if not trades:
        return KellyResult(fraction=0.01, win_rate=0.5, avg_win=1.0, avg_loss=1.0, rr_ratio=1.0, sample_size=0, capped=False)

    wins = [t["pnl_eur"] for t in trades if t.get("pnl_eur", 0) > 0]
    losses = [abs(t["pnl_eur"]) for t in trades if t.get("pnl_eur", 0) < 0]

    total = len(wins) + len(losses)
    if total == 0:
        return KellyResult(fraction=0.01, win_rate=0.5, avg_win=1.0, avg_loss=1.0, rr_ratio=1.0, sample_size=0, capped=False)

    win_rate = len(wins) / total if total > 0 else 0.5
    avg_win = sum(wins) / len(wins) if wins else 1.0
    avg_loss = sum(losses) / len(losses) if losses else 1.0
    rr_ratio = avg_win / avg_loss if avg_loss > 0 else 1.0

    # Kelly formula: f = (b*p - q) / b
    # where b = R:R ratio, p = win rate, q = 1 - p
    p = win_rate
    q = 1.0 - p
    b = rr_ratio

    if b <= 0:
        raw_kelly = 0.0
    else:
        raw_kelly = (b * p - q) / b

    # Negative Kelly means edge is negative — don't trade
    raw_kelly = max(0.0, raw_kelly)

    # Apply half-Kelly for safety (common practice)
    half_kelly = raw_kelly * 0.5

    capped = half_kelly > max_cap
    final_fraction = min(half_kelly, max_cap)

    # Fall back to conservative sizing if sample too small
    if total < MIN_SAMPLE_SIZE:
        final_fraction = min(final_fraction, 0.02)

    return KellyResult(
        fraction=round(final_fraction, 4),
        win_rate=round(win_rate, 4),
        avg_win=round(avg_win, 4),
        avg_loss=round(avg_loss, 4),
        rr_ratio=round(rr_ratio, 4),
        sample_size=total,
        capped=capped,
    )


def calculate_kelly_from_stats(
    win_rate: float,
    rr_ratio: float,
    sample_size: int = 50,
    max_cap: float = MAX_KELLY_FRACTION,
) -> KellyResult:
    """Calculate Kelly from pre-computed stats (no raw trades needed)."""
    p = max(0.0, min(1.0, win_rate))
    q = 1.0 - p
    b = max(0.01, rr_ratio)

    raw_kelly = (b * p - q) / b
    raw_kelly = max(0.0, raw_kelly)
    half_kelly = raw_kelly * 0.5
    capped = half_kelly > max_cap
    final = min(half_kelly, max_cap)

    if sample_size < MIN_SAMPLE_SIZE:
        final = min(final, 0.02)

    return KellyResult(
        fraction=round(final, 4),
        win_rate=round(p, 4),
        avg_win=round(b, 4),
        avg_loss=1.0,
        rr_ratio=round(b, 4),
        sample_size=sample_size,
        capped=capped,
    )
