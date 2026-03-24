"""Telegram Bot — Kill Switch + Notifications for APEX Trading System."""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


class TelegramBot:
    """Handles Telegram commands and outbound notifications."""

    def __init__(self, execution_agent=None, system_controller=None):
        self.execution_agent = execution_agent
        self.system_controller = system_controller
        self._app = None

    def _check_config(self) -> bool:
        if not BOT_TOKEN or not CHAT_ID:
            logger.warning("[Telegram] BOT_TOKEN or CHAT_ID not configured — bot disabled")
            return False
        return True

    async def send_message(self, text: str) -> bool:
        """Send a message to the configured chat."""
        if not self._check_config():
            return False
        try:
            import httpx
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json={
                    "chat_id": CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML"
                })
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"[Telegram] Send failed: {e}")
            return False

    async def send_alert(self, message: str, level: str = "INFO") -> None:
        """Send an alert message. Used by all agents."""
        emoji = {"INFO": "ℹ️", "WARNING": "⚠️", "ERROR": "🚨", "CRITICAL": "🔴"}.get(level, "📢")
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        await self.send_message(f"{emoji} <b>[APEX {level}]</b> {ts}\n{message}")

    async def _handle_stop(self, update, context) -> None:
        await update.message.reply_text("🔴 KILL SWITCH ACTIVATED — closing all positions...")
        if self.execution_agent:
            results = await self.execution_agent.close_all_positions("telegram_kill_switch")
            from database.db import set_system_state
            await set_system_state("SYSTEM_PAUSED", "true")
            await update.message.reply_text(
                f"✅ All positions closed. System PAUSED.\nResults: {len(results)} positions closed.\n"
                "Use /resume to restart trading."
            )
        else:
            await update.message.reply_text("⚠️ Execution agent not connected")

    async def _handle_emergency(self, update, context) -> None:
        await update.message.reply_text(
            "⚠️ <b>EMERGENCY STOP</b> — Are you sure?\n"
            "This will close ALL positions immediately.\n"
            "Confirm: reply with /stop",
            parse_mode="HTML"
        )

    async def _handle_pause(self, update, context) -> None:
        from database.db import set_system_state
        await set_system_state("SYSTEM_PAUSED", "true")
        await update.message.reply_text("⏸️ Trading PAUSED — existing positions continue, no new trades")

    async def _handle_resume(self, update, context) -> None:
        from database.db import set_system_state
        await set_system_state("SYSTEM_PAUSED", "false")
        await update.message.reply_text("▶️ Trading RESUMED")

    async def _handle_status(self, update, context) -> None:
        from database.db import is_system_paused, get_db
        paused = await is_system_paused()
        async with await get_db() as db:
            logs = await db.execute_fetchall(
                "SELECT agent, level, message, timestamp FROM agent_logs ORDER BY id DESC LIMIT 10"
            )
        status_text = f"<b>APEX Status</b>\nPaused: {'YES ⏸️' if paused else 'NO ▶️'}\n\n<b>Recent Activity:</b>\n"
        for log in logs:
            status_text += f"[{log['agent']}] {log['message'][:50]}\n"
        await update.message.reply_text(status_text, parse_mode="HTML")

    async def _handle_positions(self, update, context) -> None:
        from database.db import get_open_trades
        trades = await get_open_trades()
        if not trades:
            await update.message.reply_text("📭 No open positions")
            return
        text = "<b>Open Positions:</b>\n"
        for t in trades:
            text += f"• {t['side']} {t['asset']} @ {t['entry_price']} (size={t['size']:.4f})\n"
        await update.message.reply_text(text, parse_mode="HTML")

    async def _handle_report(self, update, context) -> None:
        await self.send_daily_report()
        await update.message.reply_text("📊 Daily report sent")

    async def send_daily_report(self) -> None:
        """Send daily performance summary."""
        from database.db import get_db
        async with await get_db() as db:
            today = datetime.now(timezone.utc).date().isoformat()
            trades = await db.execute_fetchall(
                "SELECT * FROM trades WHERE DATE(timestamp_close) = ? AND status='closed'", (today,)
            )
            snapshot = await db.execute_fetchall(
                "SELECT * FROM snapshots WHERE date = ?", (today,)
            )

        trades_list = [dict(t) for t in trades]
        wins = [t for t in trades_list if (t.get("pnl_eur") or 0) > 0]
        losses = [t for t in trades_list if (t.get("pnl_eur") or 0) < 0]
        total_pnl = sum(t.get("pnl_eur") or 0 for t in trades_list)
        win_rate = len(wins) / len(trades_list) * 100 if trades_list else 0

        snap = dict(snapshot[0]) if snapshot else {}
        equity = snap.get("equity_eur", "N/A")

        report = (
            f"📊 <b>APEX Daily Report — {today}</b>\n\n"
            f"💰 Equity: {equity}\n"
            f"📈 P&L Today: {total_pnl:+.2f} EUR\n"
            f"🎯 Trades: {len(trades_list)} ({len(wins)}W / {len(losses)}L)\n"
            f"📊 Win Rate: {win_rate:.1f}%\n"
        )
        await self.send_message(report)

    async def run(self) -> None:
        """Start the Telegram bot and listen for commands."""
        if not self._check_config():
            logger.info("[Telegram] Bot not configured — running in silent mode")
            while True:
                await asyncio.sleep(3600)
            return

        try:
            from telegram.ext import Application, CommandHandler
            self._app = Application.builder().token(BOT_TOKEN).build()
            self._app.add_handler(CommandHandler("stop", self._handle_stop))
            self._app.add_handler(CommandHandler("emergency", self._handle_emergency))
            self._app.add_handler(CommandHandler("pause", self._handle_pause))
            self._app.add_handler(CommandHandler("resume", self._handle_resume))
            self._app.add_handler(CommandHandler("status", self._handle_status))
            self._app.add_handler(CommandHandler("positions", self._handle_positions))
            self._app.add_handler(CommandHandler("report", self._handle_report))
            logger.info("[Telegram] Bot started, listening for commands")
            await self._app.run_polling(drop_pending_updates=True)
        except Exception as e:
            logger.error(f"[Telegram] Bot error: {e}")
