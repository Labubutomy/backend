"""Authentication models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class AuthResponse(BaseModel):
    """Authentication response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class TokenData(BaseModel):
    """Token data model."""
    user_id: str
    email: str
    user_type: str
    exp: int
    iat: int


class PasswordReset(BaseModel):
    """Password reset model."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    class Config:
        json_schema_extra = {
            "example": {
                "token": "reset_token_here",
                "new_password": "NewSecurePassword123"
            }
        }


class EmailVerification(BaseModel):
    """Email verification model."""
    token: str


class RefreshToken(BaseModel):
    """Refresh token model."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout request model."""
    refresh_token: Optional[str] = None


class AuthAuditLog(BaseModel):
    """Authentication audit log model."""
    log_id: str
    user_id: Optional[str] = None
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    metadata: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True
