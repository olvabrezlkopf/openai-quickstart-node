import json
import time
import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal

import litellm
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.db_models import RequestLog
from app.models.schemas import (
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatCompletionResponse,
    Choice,
    Message,
    StreamChoice,
    Usage,
)
from app.services.router_service import ModelRoute, router_service


def _configure_litellm() -> None:
    """Set provider API keys for LiteLLM."""
    if settings.anthropic_api_key:
        litellm.anthropic_key = settings.anthropic_api_key
    if settings.openai_api_key:
        litellm.openai_key = settings.openai_api_key
    litellm.drop_params = True


_configure_litellm()


class ProxyService:
    async def chat_completion(
        self,
        model_route: ModelRoute,
        request: ChatCompletionRequest,
        team_id: uuid.UUID,
        db: AsyncSession,
    ) -> ChatCompletionResponse:
        start = time.monotonic()
        response = None
        used_route = model_route
        error_msg = None

        try:
            response = await litellm.acompletion(
                model=model_route.real_model,
                messages=[m.model_dump() for m in request.messages],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                frequency_penalty=request.frequency_penalty,
                presence_penalty=request.presence_penalty,
                stop=request.stop,
                api_base=settings.ollama_base_url if model_route.provider == "ollama" else None,
            )
        except Exception as e:
            # Try fallback if configured
            if model_route.fallback:
                fallback_route = router_service.resolve(model_route.fallback)
                if fallback_route:
                    used_route = fallback_route
                    response = await litellm.acompletion(
                        model=fallback_route.real_model,
                        messages=[m.model_dump() for m in request.messages],
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        top_p=request.top_p,
                        api_base=settings.ollama_base_url if fallback_route.provider == "ollama" else None,
                    )
                else:
                    error_msg = str(e)
                    raise
            else:
                error_msg = str(e)
                raise

        duration_ms = int((time.monotonic() - start) * 1000)

        # Extract usage
        usage = response.usage if response.usage else type("U", (), {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})()
        tokens_in = usage.prompt_tokens or 0
        tokens_out = usage.completion_tokens or 0

        # Calculate cost
        cost_usd = (
            Decimal(str(tokens_in)) / Decimal("1000") * used_route.cost_per_1k_input
            + Decimal(str(tokens_out)) / Decimal("1000") * used_route.cost_per_1k_output
        )

        # Log to database
        log_entry = RequestLog(
            team_id=team_id,
            model_alias=model_route.alias,
            real_model=used_route.real_model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost_usd,
            duration_ms=duration_ms,
            status_code=200,
            error_message=error_msg,
        )
        db.add(log_entry)
        await db.commit()

        # Build OpenAI-compatible response
        choice_msg = response.choices[0].message
        return ChatCompletionResponse(
            id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
            created=int(time.time()),
            model=model_route.alias,
            choices=[
                Choice(
                    index=0,
                    message=Message(role=choice_msg.role, content=choice_msg.content or ""),
                    finish_reason=response.choices[0].finish_reason,
                )
            ],
            usage=Usage(
                prompt_tokens=tokens_in,
                completion_tokens=tokens_out,
                total_tokens=tokens_in + tokens_out,
            ),
        )

    async def chat_completion_stream(
        self,
        model_route: ModelRoute,
        request: ChatCompletionRequest,
        team_id: uuid.UUID,
        db: AsyncSession,
    ) -> AsyncGenerator[str, None]:
        start = time.monotonic()
        used_route = model_route
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        created = int(time.time())
        total_tokens_in = 0
        total_tokens_out = 0

        try:
            response = await litellm.acompletion(
                model=model_route.real_model,
                messages=[m.model_dump() for m in request.messages],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=True,
                api_base=settings.ollama_base_url if model_route.provider == "ollama" else None,
            )
        except Exception:
            if model_route.fallback:
                fallback_route = router_service.resolve(model_route.fallback)
                if fallback_route:
                    used_route = fallback_route
                    response = await litellm.acompletion(
                        model=fallback_route.real_model,
                        messages=[m.model_dump() for m in request.messages],
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        stream=True,
                        api_base=settings.ollama_base_url if fallback_route.provider == "ollama" else None,
                    )
                else:
                    raise
            else:
                raise

        async for chunk in response:
            if hasattr(chunk, "usage") and chunk.usage:
                total_tokens_in = chunk.usage.prompt_tokens or 0
                total_tokens_out = chunk.usage.completion_tokens or 0

            if chunk.choices:
                delta = {}
                choice = chunk.choices[0]
                if hasattr(choice.delta, "role") and choice.delta.role:
                    delta["role"] = choice.delta.role
                if hasattr(choice.delta, "content") and choice.delta.content:
                    delta["content"] = choice.delta.content
                    total_tokens_out += 1  # approximate if usage not provided

                stream_chunk = ChatCompletionChunk(
                    id=completion_id,
                    created=created,
                    model=model_route.alias,
                    choices=[StreamChoice(
                        index=0,
                        delta=delta,
                        finish_reason=choice.finish_reason,
                    )],
                )
                yield f"data: {stream_chunk.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

        # Log after stream completes
        duration_ms = int((time.monotonic() - start) * 1000)
        cost_usd = (
            Decimal(str(total_tokens_in)) / Decimal("1000") * used_route.cost_per_1k_input
            + Decimal(str(total_tokens_out)) / Decimal("1000") * used_route.cost_per_1k_output
        )
        log_entry = RequestLog(
            team_id=team_id,
            model_alias=model_route.alias,
            real_model=used_route.real_model,
            tokens_in=total_tokens_in,
            tokens_out=total_tokens_out,
            cost_usd=cost_usd,
            duration_ms=duration_ms,
            status_code=200,
        )
        db.add(log_entry)
        await db.commit()


proxy_service = ProxyService()
