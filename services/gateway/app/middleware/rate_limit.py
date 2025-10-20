"""Rate limiting middleware for the gateway service."""

import time
from typing import Dict, Optional
from fastapi import Request, HTTPException
import redis.asyncio as redis
import structlog

from app.config import Settings, get_settings
from app.exceptions import RateLimitException

logger = structlog.get_logger(__name__)


class RateLimitMiddleware:
    """Rate limiting middleware for FastAPI."""
    
    def __init__(self, app, settings: Settings):
        self.app = app
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.logger = logger.bind(component="rate_limit_middleware")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Skip rate limiting for health checks
        if request.url.path.startswith("/health"):
            await self.app(scope, receive, send)
            return
        
        try:
            # Check rate limit
            if await self._is_rate_limited(request):
                self.logger.warning(
                    "Rate limit exceeded",
                    client_ip=request.client.host if request.client else None,
                    path=request.url.path
                )
                raise RateLimitException("Rate limit exceeded")
            
        except RateLimitException:
            # Return rate limit error response
            response = HTTPException(
                status_code=429,
                detail="Rate limit exceeded"
            )
            await self._send_error_response(scope, send, response)
            return
        except Exception as e:
            self.logger.error("Rate limiting error", error=str(e))
            # Continue processing on error
        
        await self.app(scope, receive, send)
    
    async def _is_rate_limited(self, request: Request) -> bool:
        """Check if request should be rate limited."""
        if not self.redis_client:
            return False
        
        # Get client identifier
        client_id = self._get_client_id(request)
        
        # Create rate limit key
        window_start = int(time.time() // self.settings.rate_limit_window)
        key = f"rate_limit:{client_id}:{window_start}"
        
        try:
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Increment counter
            pipe.incr(key)
            pipe.expire(key, self.settings.rate_limit_window)
            
            results = await pipe.execute()
            current_count = results[0]
            
            # Check if limit exceeded
            return current_count > self.settings.rate_limit_requests
            
        except Exception as e:
            self.logger.error("Redis rate limit check failed", error=str(e))
            return False
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier for rate limiting."""
        # Use IP address as primary identifier
        client_ip = request.client.host if request.client else "unknown"
        
        # Add user ID if authenticated
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.get("user_id")
            if user_id:
                return f"user:{user_id}"
        
        return f"ip:{client_ip}"
    
    async def _send_error_response(self, scope, send, error: HTTPException):
        """Send error response for rate limiting."""
        response_body = {
            "error": "RATE_LIMIT_EXCEEDED",
            "message": error.detail
        }
        
        response_data = str(response_body).encode()
        
        await send({
            "type": "http.response.start",
            "status": error.status_code,
            "headers": [
                [b"content-type", b"application/json"],
                [b"content-length", str(len(response_data)).encode()],
            ],
        })
        
        await send({
            "type": "http.response.body",
            "body": response_data,
        })
