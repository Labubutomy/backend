"""Health check router."""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.services.gateway_service import GatewayService
from app.dependencies import get_gateway_service

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]


@router.get("/", response_model=HealthResponse)
async def health_check(request: Request):
    """Basic health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        services={}
    )


@router.get("/detailed")
async def detailed_health_check(
    gateway_service: GatewayService = Depends(get_gateway_service)
):
    """Detailed health check with service status."""
    services_status = {}
    
    # Check User Service
    try:
        user_healthy = await gateway_service.user_service.health_check()
        services_status["user-service"] = "healthy" if user_healthy else "unhealthy"
    except Exception:
        services_status["user-service"] = "unhealthy"
    
    # Check Task Service
    try:
        task_healthy = await gateway_service.task_service.health_check()
        services_status["task-service"] = "healthy" if task_healthy else "unhealthy"
    except Exception:
        services_status["task-service"] = "unhealthy"
    
    # Check Recommendation Service
    try:
        rec_healthy = await gateway_service.recommendation_service.health_check()
        services_status["recommendation-service"] = "healthy" if rec_healthy else "unhealthy"
    except Exception:
        services_status["recommendation-service"] = "unhealthy"
    
    # Check Presence Service
    try:
        presence_healthy = await gateway_service.presence_service.health_check()
        services_status["presence-service"] = "healthy" if presence_healthy else "unhealthy"
    except Exception:
        services_status["presence-service"] = "unhealthy"
    
    # Check Redis
    try:
        if gateway_service.redis_client:
            await gateway_service.redis_client.ping()
            services_status["redis"] = "healthy"
        else:
            services_status["redis"] = "not_connected"
    except Exception:
        services_status["redis"] = "unhealthy"
    
    # Check NATS
    try:
        if gateway_service.nats_client and gateway_service.nats_client.is_connected:
            services_status["nats"] = "healthy"
        else:
            services_status["nats"] = "unhealthy"
    except Exception:
        services_status["nats"] = "unhealthy"
    
    # Overall status
    all_healthy = all(status == "healthy" for status in services_status.values())
    overall_status = "healthy" if all_healthy else "degraded"
    
    return {
        "status": overall_status,
        "version": "1.0.0",
        "services": services_status
    }


@router.get("/ready")
async def readiness_check(
    gateway_service: GatewayService = Depends(get_gateway_service)
):
    """Kubernetes readiness probe."""
    try:
        # Check critical services
        user_healthy = await gateway_service.user_service.health_check()
        task_healthy = await gateway_service.task_service.health_check()
        
        if user_healthy and task_healthy:
            return {"status": "ready"}
        else:
            return {"status": "not ready", "reason": "critical services unhealthy"}
    except Exception as e:
        return {"status": "not ready", "reason": str(e)}


@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe."""
    return {"status": "alive"}
