"""Configuration management for the gateway service."""

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Server configuration
    host: str = Field(default="0.0.0.0", env="GATEWAY_HOST")
    port: int = Field(default=8000, env="GATEWAY_PORT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Service URLs
    user_service_url: str = Field(
        default="localhost:50051",
        env="USER_SERVICE_URL"
    )
    task_service_url: str = Field(
        default="localhost:50052", 
        env="TASK_SERVICE_URL"
    )
    recommendation_service_url: str = Field(
        default="localhost:50054",
        env="RECOMMENDATION_SERVICE_URL"
    )
    presence_service_url: str = Field(
        default="http://localhost:8080",
        env="PRESENCE_SERVICE_URL"
    )
    
    # Database
    database_url: str = Field(
        default="postgres://postgres:postgres@localhost:5432/freelance_platform?sslmode=disable",
        env="DATABASE_URL"
    )
    
    # Infrastructure URLs
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    nats_url: str = Field(
        default="nats://localhost:4222",
        env="NATS_URL"
    )
    
    # Security
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        env="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        env="JWT_ALGORITHM"
    )
    jwt_access_token_expire_minutes: int = Field(
        default=30,
        env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7,
        env="JWT_REFRESH_TOKEN_EXPIRE_DAYS"
    )
    
    # Rate limiting
    rate_limit_requests: int = Field(
        default=1000,
        env="RATE_LIMIT_REQUESTS"
    )
    rate_limit_window: int = Field(
        default=60,  # seconds
        env="RATE_LIMIT_WINDOW"
    )
    
    # Circuit breaker
    circuit_breaker_failure_threshold: int = Field(
        default=5,
        env="CIRCUIT_BREAKER_FAILURE_THRESHOLD"
    )
    circuit_breaker_timeout: int = Field(
        default=60,  # seconds
        env="CIRCUIT_BREAKER_TIMEOUT"
    )
    
    # Timeouts
    grpc_timeout: int = Field(
        default=30,  # seconds
        env="GRPC_TIMEOUT"
    )
    http_timeout: int = Field(
        default=30,  # seconds
        env="HTTP_TIMEOUT"
    )
    
    # Caching
    cache_ttl: int = Field(
        default=300,  # seconds
        env="CACHE_TTL"
    )
    
    # Monitoring
    metrics_enabled: bool = Field(
        default=True,
        env="METRICS_ENABLED"
    )
    metrics_port: int = Field(
        default=9090,
        env="METRICS_PORT"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
