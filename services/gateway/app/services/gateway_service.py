"""Gateway service class."""

import asyncio
from typing import Optional
import redis.asyncio as redis
import nats
import structlog

from app.services.user_service import UserServiceClient
from app.services.task_service import TaskServiceClient
from app.services.recommendation_service import RecommendationServiceClient
from app.services.presence_service import PresenceServiceClient
from app.config import Settings
from app.metrics import REQUEST_COUNTER, REQUEST_DURATION, SERVICE_HEALTH

logger = structlog.get_logger(__name__)


class GatewayService:
    """Main gateway service that coordinates all microservices."""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.nats_client: Optional[nats.NATS] = None
        
        # Service clients
        self.user_service = UserServiceClient(settings)
        self.task_service = TaskServiceClient(settings)
        self.recommendation_service = RecommendationServiceClient(settings)
        self.presence_service = PresenceServiceClient(settings)
        
    
    async def initialize(self):
        """Initialize connections to external services."""
        try:
            # Initialize Redis connection
            self.redis_client = redis.from_url(
                self.settings.redis_url,
                decode_responses=True
            )
            await self.redis_client.ping()
            
            # Initialize NATS connection
            self.nats_client = await nats.connect(
                self.settings.nats_url
            )
            
            # Initialize service clients
            await self.user_service.initialize()
            await self.task_service.initialize()
            await self.recommendation_service.initialize()
            await self.presence_service.initialize()
            
        except Exception as e:
            logger.error("Failed to initialize gateway service", error=str(e))
            # Don't raise - let the service start even if some connections fail
            pass
    
    async def shutdown(self):
        """Shutdown connections to external services."""
        try:
            if self.redis_client:
                await self.redis_client.close()
            
            if self.nats_client:
                await self.nats_client.close()
            
            # Shutdown service clients
            if hasattr(self, 'user_service') and self.user_service:
                await self.user_service.shutdown()
            if hasattr(self, 'task_service') and self.task_service:
                await self.task_service.shutdown()
            if hasattr(self, 'recommendation_service') and self.recommendation_service:
                await self.recommendation_service.shutdown()
            if hasattr(self, 'presence_service') and self.presence_service:
                await self.presence_service.shutdown()
            
        except Exception as e:
            logger.error("Error during gateway service shutdown", error=str(e))
    
    async def health_check(self) -> dict:
        """Check health of all services."""
        health_status = {
            "status": "healthy",
            "services": {}
        }
        
        # Check Redis
        try:
            if self.redis_client:
                await self.redis_client.ping()
                health_status["services"]["redis"] = "healthy"
            else:
                health_status["services"]["redis"] = "not_connected"
        except Exception:
            health_status["services"]["redis"] = "unhealthy"
            health_status["status"] = "degraded"
        
        # Check NATS
        try:
            if self.nats_client and self.nats_client.is_connected:
                health_status["services"]["nats"] = "healthy"
            else:
                health_status["services"]["nats"] = "not_connected"
        except Exception:
            health_status["services"]["nats"] = "unhealthy"
            health_status["status"] = "degraded"
        
        # Check microservices
        for service_name, service in [
            ("user_service", self.user_service),
            ("task_service", self.task_service),
            ("recommendation_service", self.recommendation_service),
            ("presence_service", self.presence_service)
        ]:
            try:
                if hasattr(service, 'health_check'):
                    service_health = await service.health_check()
                    health_status["services"][service_name] = service_health
                else:
                    health_status["services"][service_name] = "unknown"
            except Exception:
                health_status["services"][service_name] = "unhealthy"
                health_status["status"] = "degraded"
        
        return health_status
