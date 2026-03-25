from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import ModelConfig


@dataclass
class ModelRoute:
    alias: str
    real_model: str
    provider: str
    fallback: str | None
    cost_per_1k_input: Decimal
    cost_per_1k_output: Decimal


class RouterService:
    def __init__(self) -> None:
        self._yaml_models: dict[str, ModelRoute] = {}
        self._db_overrides: dict[str, ModelRoute] = {}

    async def load_yaml(self, path: str) -> None:
        config_path = Path(path)
        if not config_path.exists():
            return
        with open(config_path) as f:
            data = yaml.safe_load(f)
        models = data.get("models", {})
        for alias, cfg in models.items():
            self._yaml_models[alias] = ModelRoute(
                alias=alias,
                real_model=cfg["real_model"],
                provider=cfg["provider"],
                fallback=cfg.get("fallback"),
                cost_per_1k_input=Decimal(str(cfg.get("cost_per_1k_input", 0))),
                cost_per_1k_output=Decimal(str(cfg.get("cost_per_1k_output", 0))),
            )

    async def refresh_from_db(self, db: AsyncSession) -> None:
        result = await db.execute(select(ModelConfig).where(ModelConfig.is_active == True))  # noqa: E712
        configs = result.scalars().all()
        self._db_overrides = {}
        for cfg in configs:
            self._db_overrides[cfg.alias] = ModelRoute(
                alias=cfg.alias,
                real_model=cfg.real_model,
                provider=cfg.provider,
                fallback=cfg.fallback,
                cost_per_1k_input=cfg.cost_per_1k_input,
                cost_per_1k_output=cfg.cost_per_1k_output,
            )

    def resolve(self, alias: str) -> ModelRoute | None:
        """Resolve a model alias. DB overrides take priority over YAML."""
        return self._db_overrides.get(alias) or self._yaml_models.get(alias)

    def list_aliases(self) -> list[str]:
        """Return all known model aliases."""
        all_aliases = set(self._yaml_models.keys()) | set(self._db_overrides.keys())
        return sorted(all_aliases)

    def get_all_routes(self) -> list[ModelRoute]:
        """Return all model routes with DB overrides applied."""
        merged: dict[str, ModelRoute] = {}
        merged.update(self._yaml_models)
        merged.update(self._db_overrides)
        return sorted(merged.values(), key=lambda r: r.alias)


router_service = RouterService()
