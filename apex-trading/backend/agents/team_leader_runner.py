"""Runner script for Team Leader agent (used by watchdog)."""
import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import init_db
from connectors.hyperliquid import HyperliquidConnector
from agents.team_leader import TeamLeader


async def main():
    await init_db()
    hl = HyperliquidConnector()
    # Start WebSocket in background so prices are available
    ws_task = asyncio.create_task(hl.connect_websocket())
    leader = TeamLeader(hl)
    await leader.run()


if __name__ == "__main__":
    asyncio.run(main())
