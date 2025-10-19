"""Prometheus metrics for the gateway service."""

from prometheus_client import Counter, Histogram, Gauge

# Request metrics
REQUEST_COUNTER = Counter(
    'gateway_requests_total',
    'Total number of requests processed by gateway',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'gateway_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

# Service health metrics
SERVICE_HEALTH = Gauge(
    'gateway_service_health',
    'Health status of microservices',
    ['service_name']
)

# Circuit breaker metrics
CIRCUIT_BREAKER_STATE = Gauge(
    'gateway_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    ['service_name']
)

# Rate limiting metrics
RATE_LIMIT_REQUESTS = Counter(
    'gateway_rate_limit_requests_total',
    'Total number of rate limited requests',
    ['client_id', 'endpoint']
)

# Authentication metrics
AUTH_FAILURES = Counter(
    'gateway_auth_failures_total',
    'Total number of authentication failures',
    ['reason']
)
