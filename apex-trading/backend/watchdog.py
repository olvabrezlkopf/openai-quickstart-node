"""Watchdog — monitors all APEX agents and restarts on crash."""
import os
import sys
import asyncio
import logging
import subprocess
import json
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"watchdog","level":"%(levelname)s","msg":"%(message)s"}'
)
logger = logging.getLogger(__name__)

WATCHDOG_INTERVAL = int(os.getenv("WATCHDOG_INTERVAL_SEC", "60"))
RESTART_DELAY = 30
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

AGENT_SCRIPTS = {
    "market_analyst": f"{BASE_DIR}/agents/market_analyst.py",
    "sentiment_analyst": f"{BASE_DIR}/agents/sentiment_analyst.py",
    "execution_agent": f"{BASE_DIR}/agents/execution_agent_runner.py",
    "telegram_bot": f"{BASE_DIR}/connectors/telegram_bot_runner.py",
    "team_leader": f"{BASE_DIR}/agents/team_leader_runner.py",
    "optimizer": f"{BASE_DIR}/agents/optimizer_agent.py",
}

agent_processes: dict[str, subprocess.Popen] = {}
agent_status: dict[str, dict] = {}


async def send_telegram_alert(message: str) -> None:
    """Send a Telegram alert (minimal implementation for watchdog)."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": f"🔴 [WATCHDOG] {message}"}
            )
    except Exception as e:
        logger.error(f"Telegram alert failed: {e}")


async def emergency_close_positions() -> None:
    """Emergency: close all positions if execution agent crashes."""
    logger.critical("[Watchdog] Execution agent crashed — initiating emergency position close")
    try:
        from database.db import init_db, get_open_trades, set_system_state
        from connectors.hyperliquid import HyperliquidConnector
        await init_db()
        hl = HyperliquidConnector()
        results = await hl.close_all_positions()
        await set_system_state("SYSTEM_PAUSED", "true")
        logger.warning(f"[Watchdog] Emergency close complete: {len(results)} positions")
        await send_telegram_alert(f"Emergency position close executed. {len(results)} positions closed. System PAUSED.")
    except Exception as e:
        logger.error(f"[Watchdog] Emergency close failed: {e}")
        await send_telegram_alert(f"CRITICAL: Emergency close FAILED: {e}")


def start_agent(name: str) -> subprocess.Popen:
    """Start an agent subprocess."""
    script = AGENT_SCRIPTS.get(name)
    if not script or not os.path.exists(script):
        logger.error(f"[Watchdog] Agent script not found: {script}")
        return None

    proc = subprocess.Popen(
        [sys.executable, script],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=BASE_DIR,
    )
    agent_status[name] = {
        "pid": proc.pid,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "restart_count": agent_status.get(name, {}).get("restart_count", 0),
    }
    logger.info(f"[Watchdog] Started {name} (PID={proc.pid})")
    return proc


async def watchdog_loop() -> None:
    """Main watchdog loop — check agents every 60s."""
    # Start all agents
    for name in AGENT_SCRIPTS:
        agent_processes[name] = start_agent(name)
        await asyncio.sleep(2)  # stagger startup

    while True:
        await asyncio.sleep(WATCHDOG_INTERVAL)
        for name, proc in list(agent_processes.items()):
            if proc is None or proc.poll() is not None:
                exit_code = proc.poll() if proc else -1
                logger.error(f"[Watchdog] Agent {name} crashed (exit={exit_code})")
                agent_status[name]["status"] = "crashed"

                await send_telegram_alert(f"Agent '{name}' crashed (exit={exit_code}). Restarting in {RESTART_DELAY}s...")

                # Emergency close if execution agent crashes
                if name == "execution_agent":
                    await emergency_close_positions()

                await asyncio.sleep(RESTART_DELAY)
                new_proc = start_agent(name)
                agent_processes[name] = new_proc
                agent_status[name]["restart_count"] = agent_status[name].get("restart_count", 0) + 1

                await send_telegram_alert(f"Agent '{name}' restarted (PID={new_proc.pid if new_proc else 'N/A'})")
            else:
                agent_status[name]["status"] = "running"


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body = json.dumps({
                "status": "ok",
                "agents": agent_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass  # suppress HTTP logs


def start_health_server():
    server = HTTPServer(("0.0.0.0", 8001), HealthHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("[Watchdog] Health endpoint: http://0.0.0.0:8001/health")


async def main():
    start_health_server()
    logger.info("[Watchdog] Starting APEX watchdog...")
    await watchdog_loop()


if __name__ == "__main__":
    asyncio.run(main())
