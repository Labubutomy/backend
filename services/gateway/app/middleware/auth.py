"""Authentication middleware for the gateway service."""

from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog

from app.config import Settings, get_settings
from app.services.auth_service import AuthService
from app.dependencies import get_auth_service
from app.exceptions import AuthenticationException, AuthorizationException

logger = structlog.get_logger(__name__)

security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """Authentication middleware for FastAPI."""
    
    def __init__(self, app, settings: Settings):
        self.app = app
        self.settings = settings
        self.logger = logger.bind(component="auth_middleware")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Skip auth for health checks and public endpoints
        if self._is_public_endpoint(request.url.path):
            await self.app(scope, receive, send)
            return
        
        # Extract and validate token
        try:
            token = self._extract_token(request)
            if token:
                # Get auth service from dependency
                auth_service = get_auth_service(self.settings)
                user_data = await self._validate_token(token, auth_service)
                if user_data:
                    # Add user data to request state
                    request.state.user = user_data
                    request.state.authenticated = True
                else:
                    request.state.authenticated = False
            else:
                request.state.authenticated = False
                
        except Exception as e:
            self.logger.warning("Authentication error", error=str(e), path=request.url.path)
            request.state.authenticated = False
        
        await self.app(scope, receive, send)
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public and doesn't require authentication."""
        public_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
        ]
        return any(path.startswith(public_path) for public_path in public_paths)
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from request."""
        authorization = request.headers.get("Authorization")
        if not authorization:
            return None
        
        if not authorization.startswith("Bearer "):
            return None
        
        return authorization[7:]  # Remove "Bearer " prefix
    
    async def _validate_token(self, token: str, auth_service: AuthService) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return user data."""
        try:
            # Verify token using auth service
            token_data = auth_service.verify_token(token)
            if not token_data:
                return None
            
            # Check if token is blacklisted
            if await auth_service.is_token_blacklisted(token):
                return None
            
            # Return user data
            return {
                "user_id": token_data.user_id,
                "email": token_data.email,
                "user_type": token_data.user_type,
                "exp": token_data.exp,
                "iat": token_data.iat
            }
            
        except Exception as e:
            self.logger.warning("Token validation error", error=str(e))
            return None


async def get_current_user(request: Request) -> Dict[str, Any]:
    """Dependency to get current authenticated user."""
    if not hasattr(request.state, "authenticated") or not request.state.authenticated:
        raise AuthenticationException("Authentication required")
    
    return request.state.user


async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Dependency to get current user if authenticated, None otherwise."""
    if not hasattr(request.state, "authenticated") or not request.state.authenticated:
        return None
    
    return request.state.user


def require_user_type(user_type: str):
    """Decorator to require specific user type."""
    async def user_type_checker(request: Request) -> Dict[str, Any]:
        user = await get_current_user(request)
        
        if user.get("user_type") != user_type:
            raise AuthorizationException(f"Access denied. Required user type: {user_type}")
        
        return user
    
    return user_type_checker


def require_developer():
    """Require developer user type."""
    return require_user_type("DEVELOPER")


def require_client():
    """Require client user type."""
    return require_user_type("CLIENT")
