"""Base service client for gRPC services."""

import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import grpc
import redis
import structlog

from app.config import Settings
from app.exceptions import ServiceUnavailableException, CircuitBreakerException

logger = structlog.get_logger(__name__)


class CircuitBreaker:
    """Simple circuit breaker implementation."""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerException("Service temporarily unavailable")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"


class BaseServiceClient(ABC):
    """Base class for service clients."""
    
    def __init__(self, service_url: str, redis_client: Optional[redis.Redis] = None):
        self.service_url = service_url
        self.redis_client = redis_client
        self.logger = logger.bind(service=self.service_name)
        self.circuit_breaker = CircuitBreaker()
        self._channel: Optional[grpc.Channel] = None
        self._stub = None
    
    @property
    @abstractmethod
    def service_name(self) -> str:
        """Service name for logging and metrics."""
        pass
    
    @property
    @abstractmethod
    def stub_class(self):
        """gRPC stub class."""
        pass
    
    async def _get_channel(self) -> grpc.Channel:
        """Get or create gRPC channel."""
        if self._channel is None or self._channel.get_state() != grpc.ChannelConnectivity.READY:
            self._channel = grpc.aio.insecure_channel(self.service_url)
        
        return self._channel
    
    async def _get_stub(self):
        """Get or create gRPC stub."""
        if self._stub is None:
            channel = await self._get_channel()
            self._stub = self.stub_class(channel)
        
        return self._stub
    
    async def _call_with_retry(self, method_name: str, request, timeout: int = 30):
        """Call gRPC method with retry logic."""
        start_time = time.time()
        
        async def _call():
            return await self._make_grpc_call(method_name, request, timeout)
        
        try:
            result = await self.circuit_breaker.call(_call)
            duration = time.time() - start_time
            
            # Record metrics
            try:
                from app.middleware.metrics import SERVICE_CALLS, SERVICE_DURATION
                SERVICE_CALLS.labels(
                    service=self.service_name,
                    method=method_name,
                    status="success"
                ).inc()
                SERVICE_DURATION.labels(
                    service=self.service_name,
                    method=method_name
                ).observe(duration)
            except ImportError:
                pass  # Metrics not available
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            
            # Record metrics
            try:
                from app.middleware.metrics import SERVICE_CALLS, SERVICE_DURATION
                SERVICE_CALLS.labels(
                    service=self.service_name,
                    method=method_name,
                    status="error"
                ).inc()
                SERVICE_DURATION.labels(
                    service=self.service_name,
                    method=method_name
                ).observe(duration)
            except ImportError:
                pass  # Metrics not available
            
            self.logger.error(
                "Service call failed",
                method=method_name,
                error=str(e),
                duration=duration
            )
            raise ServiceUnavailableException(self.service_name, str(e))
    
    async def _make_grpc_call(self, method_name: str, request, timeout: int):
        """Make actual gRPC call."""
        stub = await self._get_stub()
        method = getattr(stub, method_name)
        
        return await method(request, timeout=timeout)
    
    async def health_check(self) -> bool:
        """Check if service is healthy."""
        try:
            # Try to call a simple method or health check
            # This should be implemented by each service
            return True
        except Exception as e:
            self.logger.warning("Health check failed", error=str(e))
            return False
    
    async def close(self):
        """Close gRPC channel."""
        if self._channel:
            await self._channel.close()
            self._channel = None
            self._stub = None


class BaseHTTPClient(ABC):
    """Base class for HTTP service clients."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.logger = logger.bind(service=self.service_name)
    
    @property
    @abstractmethod
    def service_name(self) -> str:
        """Service name for logging and metrics."""
        pass
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ):
        """Make HTTP request with error handling."""
        import httpx
        
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(method, url, json=data)
                response.raise_for_status()
                
                duration = time.time() - start_time
                
                # Record metrics
                try:
                    from app.middleware.metrics import SERVICE_CALLS, SERVICE_DURATION
                    SERVICE_CALLS.labels(
                        service=self.service_name,
                        method=f"{method} {endpoint}",
                        status="success"
                    ).inc()
                    SERVICE_DURATION.labels(
                        service=self.service_name,
                        method=f"{method} {endpoint}"
                    ).observe(duration)
                except ImportError:
                    pass  # Metrics not available
                
                return response.json() if response.content else None
                
        except Exception as e:
            duration = time.time() - start_time
            
            # Record metrics
            try:
                from app.middleware.metrics import SERVICE_CALLS, SERVICE_DURATION
                SERVICE_CALLS.labels(
                    service=self.service_name,
                    method=f"{method} {endpoint}",
                    status="error"
                ).inc()
                SERVICE_DURATION.labels(
                    service=self.service_name,
                    method=f"{method} {endpoint}"
                ).observe(duration)
            except ImportError:
                pass  # Metrics not available
            
            self.logger.error(
                "HTTP request failed",
                method=method,
                url=url,
                error=str(e),
                duration=duration
            )
            raise ServiceUnavailableException(self.service_name, str(e))
    
    async def health_check(self) -> bool:
        """Check if service is healthy."""
        try:
            response = await self._make_request("GET", "/health")
            return response is not None
        except Exception as e:
            self.logger.warning("Health check failed", error=str(e))
            return False
