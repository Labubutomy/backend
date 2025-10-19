"""Dependency injection for FastAPI."""

from typing import Optional
import asyncpg
from fastapi import Depends
from app.config import Settings, get_settings
from app.services.gateway_service import GatewayService
from app.services.auth_service import AuthService

# Global service instances
gateway_service: Optional[GatewayService] = None
auth_service: Optional[AuthService] = None
db_pool: Optional[asyncpg.Pool] = None


def get_gateway_service(settings: Settings = Depends(get_settings)) -> GatewayService:
    """Get the global gateway service instance."""
    global gateway_service
    if gateway_service is None:
        gateway_service = GatewayService(settings)
        # Service will be initialized in the lifespan handler
    return gateway_service


def get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    """Get the global auth service instance."""
    global auth_service, db_pool
    if auth_service is None:
        if db_pool is None:
            raise RuntimeError("Database pool not initialized")
        auth_service = AuthService(settings, db_pool)
    return auth_service


async def get_db_pool(settings: Settings = Depends(get_settings)) -> asyncpg.Pool:
    """Get the database connection pool."""
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
    return db_pool
