from fastapi import APIRouter, Depends

from app.middleware.auth import verify_api_key
from app.models.db_models import Team
from app.models.schemas import ModelInfo, ModelListResponse
from app.services.router_service import router_service

router = APIRouter(prefix="/v1", tags=["models"])


@router.get("/models", response_model=ModelListResponse)
async def list_models(team: Team = Depends(verify_api_key)):
    """List all available model aliases (OpenAI-compatible)."""
    aliases = router_service.list_aliases()
    return ModelListResponse(
        data=[ModelInfo(id=alias) for alias in aliases]
    )
