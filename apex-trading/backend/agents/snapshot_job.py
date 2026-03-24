"""Daily Snapshot Job — records equity + performance metrics once per day.

Runs as a long-lived process. Takes a snapshot:
- At startup (to record the opening equity of the day)
- Every hour (intraday updates)
- At 23:55 UTC (end-of-day final snapshot)
"""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone, date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import get_db, upsert_snapshot, log_agent
from connectors.hyperliquid import HyperliquidConnector

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"snapshot_job","level":"%(levelname)s","msg":"%(message)s"}',
)
logger = logging.getLogger(__name__)

AGENT_NAME = "snapshot_job"
INTERVAL_SEC = 3600  # check every hour


async def take_snapshot(hl: HyperliquidConnector) -> None:
    today = date.today().isoformat()

    try:
        account = await hl.get_account_state()
        equity = account.get("equity", 0.0)
    except Exception as e:
        logger.error(f"[Snapshot] Could not fetch account state: {e}")
        return

    # Compute today's closed P&L from trades table
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT COALESCE(SUM(pnl_eur), 0) as daily_pnl,
                      COUNT(*) as daily_trades,
                      COALESCE(SUM(fees_eur), 0) as fees_total
               FROM trades
               WHERE DATE(timestamp_close) = ?
               AND status IN ('closed', 'liquidated')""",
            (today,),
        )
        day = dict(rows[0]) if rows else {}

        # Rolling 20-trade win rate
        recent = await db.execute_fetchall(
            """SELECT pnl_eur FROM trades
               WHERE status IN ('closed', 'liquidated')
               ORDER BY timestamp_close DESC LIMIT 20"""
        )

    pnls = [r["pnl_eur"] for r in recent if r["pnl_eur"] is not None]
    win_rate = sum(1 for p in pnls if p > 0) / len(pnls) if pnls else 0.0

    await upsert_snapshot(
        date=today,
        equity_eur=equity,
        daily_pnl=day.get("daily_pnl", 0.0),
        daily_trades=day.get("daily_trades", 0),
        win_rate_rolling=round(win_rate, 4),
        fees_total=day.get("fees_total", 0.0),
    )

    logger.info(
        f"[Snapshot] {today} equity={equity:.2f} "
        f"pnl={day.get('daily_pnl', 0):.2f} "
        f"trades={day.get('daily_trades', 0)} "
        f"win_rate={win_rate:.1%}"
    )
    await log_agent(AGENT_NAME, "INFO", f"Snapshot taken: equity={equity:.2f}", {
        "date": today,
        "equity": equity,
        "daily_pnl": day.get("daily_pnl", 0),
        "win_rate": win_rate,
    })


async def run() -> None:
    from dotenv import load_dotenv
    load_dotenv()
    from database.db import init_db
    await init_db()

    hl = HyperliquidConnector()
    logger.info(f"[Snapshot] Job started (interval={INTERVAL_SEC}s)")

    # Immediate snapshot on startup
    await take_snapshot(hl)

    while True:
        await asyncio.sleep(INTERVAL_SEC)
        await take_snapshot(hl)


if __name__ == "__main__":
    asyncio.run(run())
