import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from redis.asyncio import Redis

from app.models.db_models import Team


class BudgetChecker:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    def _budget_key(self, team_id: uuid.UUID) -> str:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        return f"budget:{team_id}:{month}"

    async def check_budget(self, team: Team) -> None:
        """Check if team has exceeded monthly budget. Raises 429 if exceeded."""
        if team.budget_eur <= 0:
            return  # No budget limit set

        key = self._budget_key(team.id)
        spent = await self.redis.get(key)
        spent_val = Decimal(spent.decode()) if spent else Decimal("0")

        if spent_val >= team.budget_eur:
            raise HTTPException(
                status_code=429,
                detail=f"Monthly budget of {team.budget_eur} EUR exceeded. Current spend: {spent_val} EUR.",
            )

    async def record_cost(self, team_id: uuid.UUID, cost_usd: Decimal) -> Decimal:
        """Atomically increment the team's monthly spend. Returns new total."""
        key = self._budget_key(team_id)
        new_total = await self.redis.incrbyfloat(key, float(cost_usd))
        # Set TTL to 40 days so old months auto-expire
        await self.redis.expire(key, 40 * 86400)
        return Decimal(str(new_total))

    async def get_spent(self, team_id: uuid.UUID) -> Decimal:
        """Get current monthly spend for a team."""
        key = self._budget_key(team_id)
        spent = await self.redis.get(key)
        return Decimal(spent.decode()) if spent else Decimal("0")
