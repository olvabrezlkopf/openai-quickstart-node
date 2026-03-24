"""Optimizer Agent — Auto-tune strategy parameters based on performance."""
import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import get_db, log_agent, get_recent_trades, set_system_state, get_system_state

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"optimizer","level":"%(levelname)s","msg":"%(message)s"}'
)
logger = logging.getLogger(__name__)

AGENT_NAME = "optimizer"
INTERVAL_HOURS = int(os.getenv("OPTIMIZER_INTERVAL_HOURS", "2"))
MIN_TRADES_FOR_OPTIMIZATION = 20

# Tunable parameters and their bounds
PARAM_BOUNDS = {
    "confidence_threshold": (0.55, 0.85),  # min/max
    "stop_loss_pct":        (0.02, 0.06),
    "take_profit_ratio":    (1.5, 4.0),
    "cooldown_minutes":     (10, 60),
}

# Default values
PARAM_DEFAULTS = {
    "confidence_threshold": 0.65,
    "stop_loss_pct":        0.03,
    "take_profit_ratio":    2.0,
    "cooldown_minutes":     15,
}

# Step sizes for adjustment
PARAM_STEPS = {
    "confidence_threshold": 0.02,
    "stop_loss_pct":        0.005,
    "take_profit_ratio":    0.25,
    "cooldown_minutes":     5,
}


async def load_params() -> dict:
    """Load current optimizer params from DB state."""
    params = {}
    for key, default in PARAM_DEFAULTS.items():
        raw = await get_system_state(f"OPT_{key.upper()}")
        try:
            params[key] = float(raw) if raw is not None else default
        except (ValueError, TypeError):
            params[key] = default
    return params


async def save_params(params: dict) -> None:
    """Persist optimizer params to DB state."""
    for key, value in params.items():
        await set_system_state(f"OPT_{key.upper()}", str(value))


def compute_performance_metrics(trades: list[dict]) -> dict:
    """Compute key performance metrics from closed trades."""
    if not trades:
        return {
            "win_rate": 0.5,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "profit_factor": 1.0,
            "sharpe_approx": 0.0,
            "total_pnl": 0.0,
            "trade_count": 0,
        }

    wins = [t["pnl_eur"] for t in trades if (t.get("pnl_eur") or 0) > 0]
    losses = [abs(t["pnl_eur"]) for t in trades if (t.get("pnl_eur") or 0) < 0]

    win_rate = len(wins) / len(trades) if trades else 0.5
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    profit_factor = (sum(wins) / sum(losses)) if losses and sum(losses) > 0 else float("inf")

    total_pnl = sum(t.get("pnl_eur") or 0 for t in trades)

    # Approximate Sharpe (no risk-free rate adjustment)
    pnls = [t.get("pnl_eur") or 0 for t in trades]
    mean_pnl = total_pnl / len(pnls)
    variance = sum((p - mean_pnl) ** 2 for p in pnls) / len(pnls)
    std_pnl = variance ** 0.5
    sharpe_approx = mean_pnl / std_pnl if std_pnl > 0 else 0.0

    return {
        "win_rate": round(win_rate, 4),
        "avg_win": round(avg_win, 4),
        "avg_loss": round(avg_loss, 4),
        "profit_factor": round(profit_factor, 4),
        "sharpe_approx": round(sharpe_approx, 4),
        "total_pnl": round(total_pnl, 4),
        "trade_count": len(trades),
    }


def adjust_params(params: dict, metrics: dict) -> dict:
    """
    Apply simple hill-climbing adjustments based on performance.
    Rules:
    - Low win rate → raise confidence threshold (be more selective)
    - Low profit factor → widen TP ratio
    - High win rate + good PF → slightly lower threshold (trade more)
    - Too many losses → increase cooldown
    """
    new_params = dict(params)
    win_rate = metrics["win_rate"]
    profit_factor = metrics["profit_factor"]
    sharpe = metrics["sharpe_approx"]

    def clamp(key: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, key))

    bounds = PARAM_BOUNDS
    steps = PARAM_STEPS

    # Rule 1: Poor win rate → be more selective
    if win_rate < 0.45:
        new_params["confidence_threshold"] = clamp(
            params["confidence_threshold"] + steps["confidence_threshold"],
            *bounds["confidence_threshold"]
        )
        new_params["cooldown_minutes"] = clamp(
            params["cooldown_minutes"] + steps["cooldown_minutes"],
            *bounds["cooldown_minutes"]
        )
        logger.info(f"[Optimizer] Win rate low ({win_rate:.1%}) → raising threshold and cooldown")

    # Rule 2: Good win rate → can relax threshold slightly
    elif win_rate > 0.65 and profit_factor > 1.5:
        new_params["confidence_threshold"] = clamp(
            params["confidence_threshold"] - steps["confidence_threshold"],
            *bounds["confidence_threshold"]
        )
        logger.info(f"[Optimizer] Win rate strong ({win_rate:.1%}) → lowering threshold")

    # Rule 3: Poor profit factor → wider TP
    if profit_factor < 1.2 and profit_factor != float("inf"):
        new_params["take_profit_ratio"] = clamp(
            params["take_profit_ratio"] + steps["take_profit_ratio"],
            *bounds["take_profit_ratio"]
        )
        logger.info(f"[Optimizer] Low profit factor ({profit_factor:.2f}) → widening TP")

    # Rule 4: Good Sharpe → tighten stops to protect profits
    if sharpe > 1.0:
        new_params["stop_loss_pct"] = clamp(
            params["stop_loss_pct"] - steps["stop_loss_pct"],
            *bounds["stop_loss_pct"]
        )

    return new_params


async def run_optimization_cycle() -> None:
    """Single optimization pass."""
    logger.info("[Optimizer] Starting optimization cycle")

    # Only use recent trades (last 30 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT * FROM trades
               WHERE status IN ('closed', 'liquidated')
               AND timestamp_close >= ?
               ORDER BY timestamp_close DESC""",
            (cutoff,),
        )
    recent_trades = [dict(r) for r in rows]

    if len(recent_trades) < MIN_TRADES_FOR_OPTIMIZATION:
        logger.info(
            f"[Optimizer] Only {len(recent_trades)} trades — need {MIN_TRADES_FOR_OPTIMIZATION} to optimize"
        )
        return

    metrics = compute_performance_metrics(recent_trades)
    current_params = await load_params()
    new_params = adjust_params(current_params, metrics)

    # Check if anything changed
    changed = {k: v for k, v in new_params.items() if abs(v - current_params.get(k, 0)) > 1e-9}
    if not changed:
        logger.info("[Optimizer] No parameter changes needed")
        return

    await save_params(new_params)

    logger.info(f"[Optimizer] Parameters updated: {changed}")
    logger.info(f"[Optimizer] Metrics: {metrics}")

    await log_agent(AGENT_NAME, "INFO", "Parameters optimized", {
        "metrics": metrics,
        "old_params": current_params,
        "new_params": new_params,
        "changed": changed,
    })

    # Save optimization record to DB
    async with await get_db() as db:
        await db.execute(
            """INSERT INTO optimizer_runs
               (timestamp, trade_count, win_rate, profit_factor, sharpe,
                old_params, new_params)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                datetime.now(timezone.utc).isoformat(),
                metrics["trade_count"],
                metrics["win_rate"],
                metrics["profit_factor"],
                metrics["sharpe_approx"],
                json.dumps(current_params),
                json.dumps(new_params),
            ),
        )
        await db.commit()


async def run() -> None:
    """Main loop: optimize every INTERVAL_HOURS hours."""
    logger.info(f"[Optimizer] Starting (interval={INTERVAL_HOURS}h)")
    while True:
        try:
            await run_optimization_cycle()
        except Exception as e:
            logger.error(f"[Optimizer] Cycle error: {e}")
        await asyncio.sleep(INTERVAL_HOURS * 3600)


async def main():
    from dotenv import load_dotenv
    load_dotenv()
    from database.db import init_db
    await init_db()
    await run()


if __name__ == "__main__":
    asyncio.run(main())
