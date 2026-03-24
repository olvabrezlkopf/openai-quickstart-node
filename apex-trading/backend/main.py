"""APEX Trading System — Central launcher.

Starts the FastAPI server (port 8000) and all agent subprocesses.
The watchdog.py handles crash-recovery; this file is the initial entry point.
"""
import os
import sys
import asyncio
import logging
import signal
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","component":"main","level":"%(levelname)s","msg":"%(message)s"}',
)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent
VENV_PYTHON = sys.executable  # same venv that launched main.py

# Agents launched as subprocesses (watchdog handles restarts after this)
AGENT_SCRIPTS: dict[str, Path] = {
    "market_analyst":   BASE_DIR / "agents" / "market_analyst.py",
    "sentiment_analyst":BASE_DIR / "agents" / "sentiment_analyst.py",
    "team_leader":      BASE_DIR / "agents" / "team_leader_runner.py",
    "execution_agent":  BASE_DIR / "agents" / "execution_agent_runner.py",
    "telegram_bot":     BASE_DIR / "connectors" / "telegram_bot_runner.py",
    "optimizer":        BASE_DIR / "agents" / "optimizer_agent.py",
    "snapshot_job":     BASE_DIR / "agents" / "snapshot_job.py",
}

_processes: list[subprocess.Popen] = []


def _start_agent(name: str, script: Path) -> subprocess.Popen | None:
    if not script.exists():
        logger.warning(f"[Main] Script not found, skipping: {script}")
        return None
    proc = subprocess.Popen(
        [VENV_PYTHON, str(script)],
        cwd=str(BASE_DIR),
        env={**os.environ},
    )
    logger.info(f"[Main] Started {name} (PID={proc.pid})")
    return proc


async def _start_agents() -> None:
    """Start all agents with a small stagger to avoid DB contention at boot."""
    for name, script in AGENT_SCRIPTS.items():
        proc = _start_agent(name, script)
        if proc:
            _processes.append(proc)
        await asyncio.sleep(2)


def _shutdown(signum, frame) -> None:
    logger.warning(f"[Main] Signal {signum} received — shutting down agents")
    for proc in _processes:
        try:
            proc.terminate()
        except Exception:
            pass
    sys.exit(0)


async def main() -> None:
    # Register shutdown handlers
    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT,  _shutdown)

    # Initialise database
    from database.db import init_db
    await init_db()
    logger.info("[Main] Database initialised")

    # Start all agent subprocesses
    await _start_agents()
    logger.info(f"[Main] {len(_processes)} agents started")

    # Start FastAPI via uvicorn
    import uvicorn
    config = uvicorn.Config(
        "api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", "8000")),
        log_level="info",
        loop="asyncio",
    )
    server = uvicorn.Server(config)
    logger.info("[Main] Starting FastAPI on :8000")
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
