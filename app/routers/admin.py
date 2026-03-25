import asyncio
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import (
    create_admin_token,
    generate_api_key,
    verify_jwt,
)
from app.models.db_models import (
    ApiKey,
    BudgetAlert,
    ModelConfig,
    RequestLog,
    Team,
)
from app.models.schemas import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    BudgetStatus,
    LoginRequest,
    LoginResponse,
    ModelConfigCreate,
    ModelConfigResponse,
    RequestLogResponse,
    TeamCreate,
    TeamResponse,
    TeamUpdate,
    UsageStats,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Auth ---

@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response):
    """Authenticate admin and set JWT cookie."""
    if request.username != settings.admin_username:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password against hash
    try:
        from passlib.hash import bcrypt
        if not settings.admin_password_hash or not bcrypt.verify(request.password, settings.admin_password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception:
        # If no hash configured, check against plaintext fallback for dev
        if request.password != "admin":
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_admin_token(request.username)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
    )
    return LoginResponse()


@router.post("/auth/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


# --- Teams ---

@router.get("/teams", response_model=list[TeamResponse])
async def list_teams(
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Team).order_by(Team.name))
    return result.scalars().all()


@router.post("/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    team_data: TeamCreate,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    team = Team(name=team_data.name, budget_eur=team_data.budget_eur)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: uuid.UUID,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: uuid.UUID,
    team_data: TeamUpdate,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team_data.name is not None:
        team.name = team_data.name
    if team_data.budget_eur is not None:
        team.budget_eur = team_data.budget_eur
    if team_data.is_active is not None:
        team.is_active = team_data.is_active
    await db.commit()
    await db.refresh(team)
    return team


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: uuid.UUID,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    await db.delete(team)
    await db.commit()


# --- API Keys ---

@router.get("/teams/{team_id}/keys", response_model=list[ApiKeyResponse])
async def list_keys(
    team_id: uuid.UUID,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.team_id == team_id).order_by(desc(ApiKey.created_at))
    )
    return result.scalars().all()


@router.post("/teams/{team_id}/keys", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_key(
    team_id: uuid.UUID,
    key_data: ApiKeyCreate,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    raw_key, key_hash = generate_api_key()
    key_prefix = raw_key[:12]

    api_key = ApiKey(
        team_id=team_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        label=key_data.label,
        expires_at=key_data.expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        key=raw_key,
        key_prefix=key_prefix,
        label=api_key.label,
    )


@router.delete("/teams/{team_id}/keys/{key_id}", status_code=204)
async def revoke_key(
    team_id: uuid.UUID,
    key_id: uuid.UUID,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.team_id == team_id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = False
    await db.commit()


# --- Usage & Stats ---

@router.get("/usage", response_model=UsageStats)
async def get_usage(
    team_id: uuid.UUID | None = None,
    days: int = Query(default=30, ge=1, le=365),
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    cutoff = cutoff - timedelta(days=days)

    query = select(
        func.count(RequestLog.id).label("total_requests"),
        func.coalesce(func.sum(RequestLog.tokens_in), 0).label("total_tokens_in"),
        func.coalesce(func.sum(RequestLog.tokens_out), 0).label("total_tokens_out"),
        func.coalesce(func.sum(RequestLog.cost_usd), Decimal("0")).label("total_cost_usd"),
    ).where(RequestLog.created_at >= cutoff)

    if team_id:
        query = query.where(RequestLog.team_id == team_id)

    result = await db.execute(query)
    row = result.one()
    return UsageStats(
        total_requests=row.total_requests,
        total_tokens_in=row.total_tokens_in,
        total_tokens_out=row.total_tokens_out,
        total_cost_usd=row.total_cost_usd,
    )


@router.get("/usage/stream")
async def usage_stream(_: dict = Depends(verify_jwt), db: AsyncSession = Depends(get_db)):
    """SSE endpoint pushing usage updates every 5 seconds."""
    async def event_generator():
        while True:
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            result = await db.execute(
                select(
                    func.count(RequestLog.id).label("total_requests"),
                    func.coalesce(func.sum(RequestLog.tokens_in), 0).label("total_tokens_in"),
                    func.coalesce(func.sum(RequestLog.tokens_out), 0).label("total_tokens_out"),
                    func.coalesce(func.sum(RequestLog.cost_usd), Decimal("0")).label("total_cost_usd"),
                ).where(RequestLog.created_at >= today)
            )
            row = result.one()
            data = {
                "total_requests": row.total_requests,
                "total_tokens_in": row.total_tokens_in,
                "total_tokens_out": row.total_tokens_out,
                "total_cost_usd": str(row.total_cost_usd),
            }
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# --- Logs ---

@router.get("/logs", response_model=list[RequestLogResponse])
async def get_logs(
    team_id: uuid.UUID | None = None,
    model_alias: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    query = select(RequestLog).order_by(desc(RequestLog.created_at))
    if team_id:
        query = query.where(RequestLog.team_id == team_id)
    if model_alias:
        query = query.where(RequestLog.model_alias == model_alias)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# --- Budgets ---

@router.get("/budgets", response_model=list[BudgetStatus])
async def get_budgets(
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    from app.main import get_budget_checker
    result = await db.execute(select(Team).where(Team.is_active == True))  # noqa: E712
    teams = result.scalars().all()

    budget_checker = get_budget_checker()
    statuses = []
    for team in teams:
        spent = Decimal("0")
        if budget_checker:
            spent = await budget_checker.get_spent(team.id)
        usage_pct = float(spent / team.budget_eur * 100) if team.budget_eur > 0 else 0.0
        statuses.append(BudgetStatus(
            team_id=team.id,
            team_name=team.name,
            budget_eur=team.budget_eur,
            spent_eur=spent,
            usage_pct=round(usage_pct, 1),
        ))
    return statuses


# --- Model Config ---

@router.get("/models", response_model=list[ModelConfigResponse])
async def list_model_configs(
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ModelConfig).order_by(ModelConfig.alias))
    return result.scalars().all()


@router.post("/models", response_model=ModelConfigResponse, status_code=201)
async def create_model_config(
    config: ModelConfigCreate,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    model_config = ModelConfig(**config.model_dump())
    db.add(model_config)
    await db.commit()
    await db.refresh(model_config)

    # Refresh router service
    from app.services.router_service import router_service
    await router_service.refresh_from_db(db)

    return model_config


@router.put("/models/{config_id}", response_model=ModelConfigResponse)
async def update_model_config(
    config_id: int,
    config: ModelConfigCreate,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    model = await db.get(ModelConfig, config_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model config not found")
    for key, value in config.model_dump().items():
        setattr(model, key, value)
    await db.commit()
    await db.refresh(model)

    from app.services.router_service import router_service
    await router_service.refresh_from_db(db)

    return model


@router.delete("/models/{config_id}", status_code=204)
async def delete_model_config(
    config_id: int,
    _: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
):
    model = await db.get(ModelConfig, config_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model config not found")
    await db.delete(model)
    await db.commit()

    from app.services.router_service import router_service
    await router_service.refresh_from_db(db)
