"""Metrics middleware for the gateway service."""

import time
from typing import Dict, Optional
from fastapi import Request
import structlog
from app.metrics import REQUEST_COUNTER, REQUEST_DURATION
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

logger = structlog.get_logger(__name__)

# Additional metrics for middleware
from prometheus_client import Gauge, Counter, Histogram

ACTIVE_CONNECTIONS = Gauge(
    'gateway_active_connections',
    'Number of active connections'
)

SERVICE_CALLS = Counter(
    'gateway_service_calls_total',
    'Total number of service calls',
    ['service', 'method', 'status']
)

SERVICE_DURATION = Histogram(
    'gateway_service_duration_seconds',
    'Service call duration in seconds',
    ['service', 'method']
)

# CIRCUIT_BREAKER_STATE is defined in app.metrics to avoid duplication


class MetricsMiddleware:
    """Metrics collection middleware for FastAPI."""
    
    def __init__(self, app):
        self.app = app
        self.logger = logger.bind(component="metrics_middleware")
        self.active_connections = 0
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Increment active connections
        self.active_connections += 1
        ACTIVE_CONNECTIONS.set(self.active_connections)
        
        # Start timing
        start_time = time.time()
        
        # Process request
        response_sent = False
        
        async def send_wrapper(message):
            nonlocal response_sent
            if message["type"] == "http.response.start" and not response_sent:
                response_sent = True
                
                # Calculate processing time
                process_time = time.time() - start_time
                
                # Record metrics
                self._record_request_metrics(request, message, process_time)
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            # Decrement active connections
            self.active_connections -= 1
            ACTIVE_CONNECTIONS.set(self.active_connections)
    
    def _record_request_metrics(
        self,
        request: Request,
        response_start: dict,
        process_time: float
    ):
        """Record request metrics."""
        method = request.method
        endpoint = self._normalize_endpoint(request.url.path)
        status_code = str(response_start.get("status", 500))
        
        # Record request count
        REQUEST_COUNTER.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
        
        # Record request duration
        REQUEST_DURATION.labels(
            method=method,
            endpoint=endpoint
        ).observe(process_time)
    
    def _normalize_endpoint(self, path: str) -> str:
        """Normalize endpoint path for metrics."""
        # Replace dynamic segments with placeholders
        normalized = path
        
        # Replace UUIDs
        import re
        normalized = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{id}', normalized)
        
        # Replace numeric IDs
        normalized = re.sub(r'/\d+', '/{id}', normalized)
        
        return normalized


def record_service_call(service: str, method: str, duration: float, success: bool = True):
    """Record service call metrics."""
    status = "success" if success else "error"
    
    SERVICE_CALLS.labels(
        service=service,
        method=method,
        status=status
    ).inc()
    
    SERVICE_DURATION.labels(
        service=service,
        method=method
    ).observe(duration)


def set_circuit_breaker_state(service: str, state: str):
    """Set circuit breaker state metric."""
    from app.metrics import CIRCUIT_BREAKER_STATE
    state_map = {"closed": 0, "open": 1, "half-open": 2}
    CIRCUIT_BREAKER_STATE.labels(service=service).set(state_map.get(state, 0))


def get_metrics():
    """Get Prometheus metrics."""
    return generate_latest()
