"""Logging middleware for the gateway service."""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
import structlog

logger = structlog.get_logger(__name__)


class LoggingMiddleware:
    """Request logging middleware for FastAPI."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Log request
        self._log_request(request, request_id)
        
        # Process request
        response_sent = False
        
        async def send_wrapper(message):
            nonlocal response_sent
            if message["type"] == "http.response.start" and not response_sent:
                response_sent = True
                # Calculate processing time
                process_time = time.time() - start_time
                
                # Log response
                self._log_response(
                    request,
                    message,
                    process_time,
                    request_id
                )
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
    
    def _log_request(self, request: Request, request_id: str):
        """Log incoming request."""
        logger.info(
            "Request received",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            content_length=request.headers.get("content-length"),
        )
    
    def _log_response(
        self,
        request: Request,
        response_start: dict,
        process_time: float,
        request_id: str
    ):
        """Log outgoing response."""
        logger.info(
            "Request completed",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            status_code=response_start.get("status"),
            process_time_ms=round(process_time * 1000, 2),
            client_ip=request.client.host if request.client else None,
        )
