from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.config import settings
from app.middleware.budget import BudgetChecker
from app.models.schemas import ErrorResponse, HealthResponse
from app.routers import admin, chat, models
from app.services.router_service import router_service

_budget_checker: BudgetChecker | None = None


def get_budget_checker() -> BudgetChecker | None:
    return _budget_checker


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _budget_checker

    # Startup
    await router_service.load_yaml(settings.model_routing_path)

    redis = Redis.from_url(settings.redis_url, decode_responses=False)
    _budget_checker = BudgetChecker(redis)
    app.state.redis = redis

    yield

    # Shutdown
    await redis.close()
    _budget_checker = None


app = FastAPI(
    title="MYLLM Proxy",
    description="Internal LLM Proxy Service — OpenAI-compatible API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(models.router)
app.include_router(admin.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return OpenAI-compatible error JSON for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error={
                "message": f"Internal server error: {exc!s}",
                "type": "internal_error",
                "code": "500",
            }
        ).model_dump(),
    )
