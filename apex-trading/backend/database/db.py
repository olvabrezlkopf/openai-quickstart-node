"""Database connection manager for APEX Trading System."""
import os
import json
import asyncio
import aiosqlite
from datetime import datetime, timezone
from typing import Optional, Any
from .models import ALL_TABLES


DB_PATH = os.getenv("DB_PATH", "./apex_trading.db")
_db_lock = asyncio.Lock()


async def get_db() -> aiosqlite.Connection:
    """Get async SQLite connection with WAL mode enabled."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    """Initialize all tables. Safe to call multiple times."""
    async with await get_db() as db:
        for table_sql in ALL_TABLES:
            await db.execute(table_sql)
        await db.commit()
    print(f"[DB] Database initialized at {DB_PATH}")


async def log_agent(agent: str, level: str, message: str, data: Optional[dict] = None) -> None:
    """Write a structured log entry from any agent."""
    async with await get_db() as db:
        await db.execute(
            "INSERT INTO agent_logs (timestamp, agent, level, message, data) VALUES (?, ?, ?, ?, ?)",
            (
                datetime.now(timezone.utc).isoformat(),
                agent,
                level,
                message,
                json.dumps(data) if data else None,
            ),
        )
        await db.commit()


async def get_system_state(key: str) -> Optional[str]:
    """Read a system state value."""
    async with await get_db() as db:
        row = await db.execute_fetchall(
            "SELECT value FROM system_state WHERE key = ?", (key,)
        )
        return row[0]["value"] if row else None


async def set_system_state(key: str, value: str) -> None:
    """Write a system state value."""
    async with await get_db() as db:
        await db.execute(
            """INSERT INTO system_state (key, value, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
            (key, value, datetime.now(timezone.utc).isoformat()),
        )
        await db.commit()


async def is_system_paused() -> bool:
    """Check if trading is paused."""
    state = await get_system_state("SYSTEM_PAUSED")
    return state == "true"


async def get_recent_trades(limit: int = 50) -> list[dict]:
    """Return the last N closed trades for Kelly/Win-Rate calculation."""
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT * FROM trades
               WHERE status IN ('closed', 'liquidated')
               ORDER BY timestamp_close DESC
               LIMIT ?""",
            (limit,),
        )
        return [dict(r) for r in rows]


async def get_open_trades() -> list[dict]:
    """Return all currently open trades."""
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM trades WHERE status = 'open' ORDER BY timestamp_open DESC"
        )
        return [dict(r) for r in rows]


async def upsert_snapshot(date: str, equity_eur: float, **kwargs) -> None:
    """Insert or update a daily performance snapshot."""
    async with await get_db() as db:
        cols = ["date", "equity_eur"] + list(kwargs.keys())
        vals = [date, equity_eur] + list(kwargs.values())
        placeholders = ", ".join(["?"] * len(cols))
        col_names = ", ".join(cols)
        update_clause = ", ".join(f"{k}=excluded.{k}" for k in kwargs.keys())
        sql = f"""INSERT INTO snapshots ({col_names}) VALUES ({placeholders})
                  ON CONFLICT(date) DO UPDATE SET equity_eur=excluded.equity_eur
                  {', ' + update_clause if update_clause else ''}"""
        await db.execute(sql, vals)
        await db.commit()
