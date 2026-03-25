"""Seed script: creates a default team and API key for local development."""
import asyncio
import hashlib
import secrets
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.database import async_session
from app.models.db_models import ApiKey, Team


async def seed():
    async with async_session() as db:
        # Check if default team exists
        result = await db.execute(select(Team).where(Team.name == "Default"))
        if result.scalar_one_or_none():
            print("Default team already exists. Skipping seed.")
            return

        # Create default team
        team = Team(name="Default", budget_eur=100)
        db.add(team)
        await db.flush()

        # Generate API key
        raw_key = "sk-ra-" + secrets.token_hex(24)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = ApiKey(
            team_id=team.id,
            key_hash=key_hash,
            key_prefix=raw_key[:12],
            label="Default dev key",
        )
        db.add(api_key)
        await db.commit()

        print("Seed complete!")
        print(f"  Team: Default (ID: {team.id})")
        print(f"  API Key (save this, shown only once): {raw_key}")
        print(f"  Key prefix: {raw_key[:12]}...")


if __name__ == "__main__":
    asyncio.run(seed())
