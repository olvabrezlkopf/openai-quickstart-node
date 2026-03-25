import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    budget_eur: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    budget_alerts: Mapped[list["BudgetAlert"]] = relationship(back_populates="team", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"), index=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(16))
    label: Mapped[str] = mapped_column(String(100), default="")
    expires_at: Mapped[datetime | None] = mapped_column(default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    team: Mapped["Team"] = relationship(back_populates="api_keys")


class RequestLog(Base):
    __tablename__ = "requests_log"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"), index=True)
    model_alias: Mapped[str] = mapped_column(String(50))
    real_model: Mapped[str] = mapped_column(String(100))
    tokens_in: Mapped[int] = mapped_column(default=0)
    tokens_out: Mapped[int] = mapped_column(default=0)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    duration_ms: Mapped[int] = mapped_column(default=0)
    status_code: Mapped[int] = mapped_column(default=200)
    error_message: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class ModelConfig(Base):
    __tablename__ = "model_config"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    alias: Mapped[str] = mapped_column(String(50), unique=True)
    real_model: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(30))
    fallback: Mapped[str | None] = mapped_column(String(100), default=None)
    cost_per_1k_input: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    cost_per_1k_output: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(default=True)


class BudgetAlert(Base):
    __tablename__ = "budget_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"), index=True)
    threshold_pct: Mapped[int] = mapped_column(default=80)
    email: Mapped[str] = mapped_column(String(255))
    triggered_at: Mapped[datetime | None] = mapped_column(default=None)

    team: Mapped["Team"] = relationship(back_populates="budget_alerts")
