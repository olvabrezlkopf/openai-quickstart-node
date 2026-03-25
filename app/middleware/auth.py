import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.db_models import ApiKey, Team

try:
    from jose import JWTError, jwt
except ImportError:
    from python_jose import JWTError, jwt  # type: ignore


def generate_api_key() -> tuple[str, str]:
    """Generate a new API key. Returns (raw_key, sha256_hash)."""
    raw = "sk-ra-" + secrets.token_hex(24)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_api_key(raw_key: str) -> str:
    """Hash an API key with SHA-256."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Team:
    """Validate Bearer API key and return the associated Team."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    raw_key = auth_header.removeprefix("Bearer ").strip()
    if not raw_key.startswith("sk-ra-"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_hash = hash_api_key(raw_key)
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)  # noqa: E712
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="API key has expired")

    team = await db.get(Team, api_key.team_id)
    if not team or not team.is_active:
        raise HTTPException(status_code=403, detail="Team is inactive")

    return team


async def verify_jwt(request: Request) -> dict:
    """Validate JWT from httpOnly cookie for admin endpoints."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def create_admin_token(username: str) -> str:
    """Create a JWT token for admin authentication."""
    from datetime import timedelta

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": username, "role": "admin", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
