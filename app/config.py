from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://proxy:proxy@localhost:5432/llmproxy"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "change-me-to-a-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Provider API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # Model routing config
    model_routing_path: str = "config/model_routing.yaml"

    # Admin credentials
    admin_username: str = "admin"
    admin_password: str = "admin"

    # Logging
    log_level: str = "INFO"


settings = Settings()
