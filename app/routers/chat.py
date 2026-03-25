from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import verify_api_key
from app.middleware.budget import BudgetChecker
from app.models.db_models import Team
from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse
from app.services.proxy_service import proxy_service
from app.services.router_service import router_service

router = APIRouter(prefix="/v1", tags=["chat"])


@router.post("/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    team: Team = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    # 1. Resolve model alias
    model_route = router_service.resolve(request.model)
    if not model_route:
        raise HTTPException(status_code=404, detail=f"Model '{request.model}' not found")

    # 2. Check budget
    from app.main import get_budget_checker
    budget_checker = get_budget_checker()
    if budget_checker:
        await budget_checker.check_budget(team)

    # 3. Proxy the request
    try:
        if request.stream:
            generator = proxy_service.chat_completion_stream(
                model_route=model_route,
                request=request,
                team_id=team.id,
                db=db,
            )
            return StreamingResponse(
                generator,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            response = await proxy_service.chat_completion(
                model_route=model_route,
                request=request,
                team_id=team.id,
                db=db,
            )

            # 4. Record cost in budget tracker
            if budget_checker:
                await budget_checker.record_cost(team.id, response.usage.prompt_tokens * 0 + 0)  # cost already logged in proxy_service

            return response

    except HTTPException:
        raise
    except Exception as e:
        # Log the error
        from app.models.db_models import RequestLog
        log_entry = RequestLog(
            team_id=team.id,
            model_alias=request.model,
            real_model=model_route.real_model,
            status_code=500,
            error_message=str(e)[:500],
        )
        db.add(log_entry)
        await db.commit()

        raise HTTPException(
            status_code=502,
            detail=f"Provider error: {e!s}",
        )
