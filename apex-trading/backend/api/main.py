"""FastAPI REST API for APEX Trading System dashboard."""
import os
import sys
import json
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import (
    get_db, is_system_paused, set_system_state,
    get_open_trades, get_recent_trades,
)

app = FastAPI(
    title="APEX Trading System API",
    version="1.0.0",
    description="Dashboard API for the APEX automated crypto trading system",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Response Models ─────────────────────────────────────────────────────────

class SystemStatus(BaseModel):
    paused: bool
    timestamp: str
    agents: dict = {}


class TradeOut(BaseModel):
    id: str
    asset: str
    side: str
    entry_price: float
    exit_price: Optional[float]
    size: float
    leverage: int
    pnl_eur: Optional[float]
    status: str
    timestamp_open: str
    timestamp_close: Optional[str]
    signal_confidence: Optional[float]
    kelly_fraction: Optional[float]
    position_size_eur: Optional[float]


class PerformanceMetrics(BaseModel):
    total_trades: int
    open_trades: int
    win_rate: float
    total_pnl_eur: float
    avg_win_eur: float
    avg_loss_eur: float
    profit_factor: float
    equity_eur: float
    daily_pnl_eur: float


class SignalOut(BaseModel):
    id: str
    timestamp: str
    asset: str
    side: str
    confidence: float
    status: str
    rejection_reason: Optional[str]
    trade_id: Optional[str]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/status", response_model=SystemStatus)
async def get_status():
    """Get current system status."""
    paused = await is_system_paused()
    return SystemStatus(
        paused=paused,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/api/pause")
async def pause_trading():
    """Pause new trade entries (existing positions unaffected)."""
    await set_system_state("SYSTEM_PAUSED", "true")
    return {"status": "paused", "message": "New trade entries paused"}


@app.post("/api/resume")
async def resume_trading():
    """Resume trading."""
    await set_system_state("SYSTEM_PAUSED", "false")
    return {"status": "active", "message": "Trading resumed"}


@app.get("/api/trades", response_model=list[TradeOut])
async def list_trades(
    status: Optional[str] = Query(None, description="Filter by status: open, closed"),
    limit: int = Query(100, le=500),
    asset: Optional[str] = Query(None),
):
    """List trades with optional filters."""
    async with await get_db() as db:
        conditions = []
        params: list = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if asset:
            conditions.append("asset = ?")
            params.append(asset.upper())

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = await db.execute_fetchall(
            f"SELECT * FROM trades {where} ORDER BY timestamp_open DESC LIMIT ?",
            params,
        )
    return [dict(r) for r in rows]


@app.get("/api/trades/open", response_model=list[TradeOut])
async def list_open_trades():
    """List all currently open trades."""
    return await get_open_trades()


@app.get("/api/performance", response_model=PerformanceMetrics)
async def get_performance(days: int = Query(30, le=365)):
    """Get aggregated performance metrics."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    async with await get_db() as db:
        all_trades = await db.execute_fetchall(
            "SELECT * FROM trades WHERE timestamp_open >= ?", (cutoff,)
        )
        snapshot = await db.execute_fetchall(
            "SELECT * FROM snapshots ORDER BY date DESC LIMIT 1"
        )
        today_snap = await db.execute_fetchall(
            "SELECT * FROM snapshots WHERE date = ?",
            (date.today().isoformat(),)
        )

    trades = [dict(r) for r in all_trades]
    closed = [t for t in trades if t["status"] in ("closed", "liquidated")]
    open_trades = [t for t in trades if t["status"] == "open"]

    wins = [t["pnl_eur"] for t in closed if (t.get("pnl_eur") or 0) > 0]
    losses = [abs(t["pnl_eur"]) for t in closed if (t.get("pnl_eur") or 0) < 0]

    win_rate = len(wins) / len(closed) if closed else 0.0
    total_pnl = sum(t.get("pnl_eur") or 0 for t in closed)
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    profit_factor = sum(wins) / sum(losses) if losses and sum(losses) > 0 else 0.0

    snap = dict(snapshot[0]) if snapshot else {}
    today = dict(today_snap[0]) if today_snap else {}
    equity = snap.get("equity_eur", 0.0)
    daily_pnl = today.get("daily_pnl", 0.0) or 0.0

    return PerformanceMetrics(
        total_trades=len(closed),
        open_trades=len(open_trades),
        win_rate=round(win_rate, 4),
        total_pnl_eur=round(total_pnl, 2),
        avg_win_eur=round(avg_win, 2),
        avg_loss_eur=round(avg_loss, 2),
        profit_factor=round(profit_factor, 4),
        equity_eur=round(equity, 2),
        daily_pnl_eur=round(daily_pnl, 2),
    )


@app.get("/api/signals", response_model=list[SignalOut])
async def list_signals(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """List recent signals."""
    async with await get_db() as db:
        conditions = []
        params: list = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = await db.execute_fetchall(
            f"SELECT * FROM signals {where} ORDER BY timestamp DESC LIMIT ?",
            params,
        )
    return [dict(r) for r in rows]


@app.get("/api/logs")
async def list_logs(
    agent: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    """Get agent logs."""
    async with await get_db() as db:
        conditions = []
        params: list = []
        if agent:
            conditions.append("agent = ?")
            params.append(agent)
        if level:
            conditions.append("level = ?")
            params.append(level.upper())
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = await db.execute_fetchall(
            f"SELECT * FROM agent_logs {where} ORDER BY id DESC LIMIT ?",
            params,
        )
    return [dict(r) for r in rows]


@app.get("/api/snapshots")
async def list_snapshots(days: int = Query(30, le=365)):
    """Get daily equity snapshots for charting."""
    from datetime import timedelta
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM snapshots WHERE date >= ? ORDER BY date ASC",
            (cutoff,),
        )
    return [dict(r) for r in rows]


@app.get("/api/sentiment")
async def list_sentiment(
    asset: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """Get recent sentiment scores."""
    async with await get_db() as db:
        conditions = []
        params: list = []
        if asset:
            conditions.append("asset = ?")
            params.append(asset.upper())
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        rows = await db.execute_fetchall(
            f"SELECT * FROM sentiment_scores {where} ORDER BY timestamp DESC LIMIT ?",
            params,
        )
    return [dict(r) for r in rows]


@app.get("/api/optimizer")
async def list_optimizer_runs(limit: int = Query(20, le=100)):
    """Get recent optimizer run history."""
    async with await get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM optimizer_runs ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
    return [dict(r) for r in rows]


@app.get("/api/health")
async def health():
    """Simple health check."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    from database.db import init_db
    await init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
