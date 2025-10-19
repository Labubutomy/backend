"""Authentication router."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.auth_service import AuthService
from app.models.user import UserCreate, UserLogin, UserResponse
from app.models.auth import AuthResponse, RefreshToken, LogoutRequest
from app.config import Settings, get_settings
from app.dependencies import get_auth_service

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=AuthResponse)
async def login(
    request: UserLogin,
    http_request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return JWT token."""
    try:
        ip_address = http_request.client.host if http_request.client else None
        user_agent = http_request.headers.get("user-agent")
        
        user, auth_response = await auth_service.authenticate_user(
            request, ip_address, user_agent
        )
        return auth_response
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Authentication error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/register", response_model=AuthResponse)
async def register(
    request: UserCreate,
    http_request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register new user and return JWT token."""
    try:
        ip_address = http_request.client.host if http_request.client else None
        
        user, auth_response = await auth_service.create_user(request, ip_address)
        return auth_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Registration error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    request: RefreshToken,
    http_request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Refresh JWT token."""
    try:
        ip_address = http_request.client.host if http_request.client else None
        
        auth_response = await auth_service.refresh_token(
            request.refresh_token, ip_address
        )
        return auth_response
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Refresh token error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: LogoutRequest = None,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Logout user and blacklist token."""
    try:
        success = await auth_service.logout(
            credentials.credentials, 
            request.refresh_token if request else None
        )
        
        if not success:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {"message": "Successfully logged out"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Logout failed")


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Get current user information."""
    try:
        # Verify token
        token_data = auth_service.verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if token is blacklisted
        if await auth_service.is_token_blacklisted(credentials.credentials):
            raise HTTPException(status_code=401, detail="Token has been revoked")
        
        # Get user data
        user = await auth_service.get_user_by_id(token_data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user information")
