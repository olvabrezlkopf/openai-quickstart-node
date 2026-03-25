import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --- OpenAI-compatible Chat API schemas ---

class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[Message]
    temperature: float | None = None
    max_tokens: int | None = None
    stream: bool = False
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    stop: list[str] | str | None = None


class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class Choice(BaseModel):
    index: int = 0
    message: Message
    finish_reason: str | None = "stop"


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[Choice]
    usage: Usage


class StreamChoice(BaseModel):
    index: int = 0
    delta: dict
    finish_reason: str | None = None


class ChatCompletionChunk(BaseModel):
    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    choices: list[StreamChoice]


# --- Model listing ---

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    owned_by: str = "myllm-proxy"


class ModelListResponse(BaseModel):
    object: str = "list"
    data: list[ModelInfo]


# --- Team management ---

class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    budget_eur: Decimal = Field(default=Decimal("0"), ge=0)


class TeamUpdate(BaseModel):
    name: str | None = None
    budget_eur: Decimal | None = None
    is_active: bool | None = None


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    budget_eur: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- API Key management ---

class ApiKeyCreate(BaseModel):
    label: str = ""
    expires_at: datetime | None = None


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    key_prefix: str
    label: str
    is_active: bool
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(BaseModel):
    """Returned only on creation — contains the raw key (shown once)."""
    id: uuid.UUID
    key: str
    key_prefix: str
    label: str


# --- Budget & Usage ---

class BudgetStatus(BaseModel):
    team_id: uuid.UUID
    team_name: str
    budget_eur: Decimal
    spent_eur: Decimal
    usage_pct: float


class UsageStats(BaseModel):
    total_requests: int = 0
    total_tokens_in: int = 0
    total_tokens_out: int = 0
    total_cost_usd: Decimal = Decimal("0")


class DailyUsageStats(UsageStats):
    date: str


class RequestLogResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    model_alias: str
    real_model: str
    tokens_in: int
    tokens_out: int
    cost_usd: Decimal
    duration_ms: int
    status_code: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Model config management ---

class ModelConfigCreate(BaseModel):
    alias: str = Field(min_length=1, max_length=50)
    real_model: str
    provider: str
    fallback: str | None = None
    cost_per_1k_input: Decimal = Decimal("0")
    cost_per_1k_output: Decimal = Decimal("0")


class ModelConfigResponse(BaseModel):
    id: int
    alias: str
    real_model: str
    provider: str
    fallback: str | None
    cost_per_1k_input: Decimal
    cost_per_1k_output: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


# --- Auth ---

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    message: str = "Login successful"


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


# --- Error (OpenAI-compatible) ---

class ErrorDetail(BaseModel):
    message: str
    type: str
    code: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
