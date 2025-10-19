#!/usr/bin/env python3
"""
DevMatch Gateway Service

A FastAPI-based gateway that routes requests to appropriate microservices
and provides a unified REST API for the DevMatch platform.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog
import uvicorn

from app.config import Settings, get_settings
from app.middleware.auth import AuthMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.tasks import router as tasks_router
from app.routers.matching import router as matching_router
from app.routers.health import router as health_router
from app.services.gateway_service import GatewayService
from app.exceptions import GatewayException, ServiceUnavailableException


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    settings = get_settings()
    gateway_service = GatewayService(settings)
    
    # Initialize database pool
    from app.dependencies import get_db_pool
    db_pool = await get_db_pool(settings)
    
    try:
        await gateway_service.initialize()
        logger.info("Gateway service initialized successfully")
        yield
    except Exception as e:
        logger.error("Failed to initialize gateway service", error=str(e))
        # Continue anyway - some services might work
        yield
    finally:
        try:
            await gateway_service.shutdown()
            await db_pool.close()
            logger.info("Gateway service shutdown completed")
        except Exception as e:
            logger.error("Error during gateway service shutdown", error=str(e))


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="DevMatch Gateway API",
        description="Gateway service for DevMatch platform microservices",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure properly for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(AuthMiddleware, settings=settings)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(MetricsMiddleware)
    
    # Include routers
    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
    app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
    app.include_router(tasks_router, prefix="/api/v1/tasks", tags=["tasks"])
    app.include_router(matching_router, prefix="/api/v1/matching", tags=["matching"])
    
    # Global exception handler
    @app.exception_handler(GatewayException)
    async def gateway_exception_handler(request: Request, exc: GatewayException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        )
    
    @app.exception_handler(ServiceUnavailableException)
    async def service_unavailable_handler(request: Request, exc: ServiceUnavailableException):
        return JSONResponse(
            status_code=503,
            content={
                "error": "SERVICE_UNAVAILABLE",
                "message": "The requested service is temporarily unavailable",
                "details": {"service": exc.service_name}
            }
        )
    
    return app


# Create the app
app = create_app()


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Get settings
    settings = get_settings()
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
        access_log=True
    )
