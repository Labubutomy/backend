"""User models for authentication."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


class UserType(str, Enum):
    """User type enumeration."""
    CLIENT = "CLIENT"
    DEVELOPER = "DEVELOPER"
    ADMIN = "ADMIN"


class User(BaseModel):
    """User model."""
    user_id: str
    email: EmailStr
    display_name: str
    user_type: UserType
    email_verified: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """User creation model."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=255)
    user_type: UserType

    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @validator('display_name')
    def validate_display_name(cls, v):
        """Validate display name."""
        if not v.strip():
            raise ValueError('Display name cannot be empty')
        return v.strip()


class UserLogin(BaseModel):
    """User login model."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """User response model."""
    user_id: str
    email: EmailStr
    display_name: str
    user_type: UserType
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """User update model."""
    display_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None

    @validator('display_name')
    def validate_display_name(cls, v):
        """Validate display name."""
        if v is not None and not v.strip():
            raise ValueError('Display name cannot be empty')
        return v.strip() if v else v


class PasswordChange(BaseModel):
    """Password change model."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
