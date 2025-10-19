"""Custom exceptions for the gateway service."""


class GatewayException(Exception):
    """Base exception for gateway service."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "GATEWAY_ERROR",
        status_code: int = 500,
        details: dict = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ServiceUnavailableException(GatewayException):
    """Exception raised when a microservice is unavailable."""
    
    def __init__(self, service_name: str, message: str = None):
        self.service_name = service_name
        super().__init__(
            message or f"Service {service_name} is unavailable",
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details={"service": service_name}
        )


class AuthenticationException(GatewayException):
    """Exception raised for authentication errors."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message,
            error_code="AUTHENTICATION_FAILED",
            status_code=401
        )


class AuthorizationException(GatewayException):
    """Exception raised for authorization errors."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message,
            error_code="ACCESS_DENIED",
            status_code=403
        )


class ValidationException(GatewayException):
    """Exception raised for validation errors."""
    
    def __init__(self, message: str, field: str = None):
        super().__init__(
            message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details={"field": field} if field else {}
        )


class RateLimitException(GatewayException):
    """Exception raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429
        )


class CircuitBreakerException(GatewayException):
    """Exception raised when circuit breaker is open."""
    
    def __init__(self, service_name: str):
        super().__init__(
            f"Service {service_name} is temporarily unavailable due to high error rate",
            error_code="CIRCUIT_BREAKER_OPEN",
            status_code=503,
            details={"service": service_name}
        )
