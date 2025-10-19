"""Session models for authentication."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserSession(BaseModel):
    """User session model."""
    session_id: str
    user_id: str
    access_token_hash: str
    refresh_token_hash: str
    expires_at: datetime
    refresh_expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    """Session creation model."""
    user_id: str
    access_token_hash: str
    refresh_token_hash: str
    expires_at: datetime
    refresh_expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class SessionResponse(BaseModel):
    """Session response model."""
    session_id: str
    user_id: str
    expires_at: datetime
    refresh_expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool
    created_at: datetime


class SessionUpdate(BaseModel):
    """Session update model."""
    is_active: Optional[bool] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
