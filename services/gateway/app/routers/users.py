"""Users router for developer management."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr

from app.services.gateway_service import GatewayService
from app.middleware.auth import get_current_user, require_developer
from app.dependencies import get_gateway_service

router = APIRouter()


class DeveloperProfile(BaseModel):
    user_id: str
    display_name: str
    email: str
    skill_tags: List[str]
    hourly_rate: float
    rating: float
    presence: str
    updated_at: str


class CreateDeveloperProfileRequest(BaseModel):
    display_name: str
    email: EmailStr
    skill_tags: List[str]
    hourly_rate: float


class UpdateDeveloperProfileRequest(BaseModel):
    skill_tags: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    bio: Optional[str] = None
    links: Optional[List[str]] = None


class UpdatePresenceRequest(BaseModel):
    presence: str  # OFFLINE, IDLE, SEARCHING


class ListDevelopersRequest(BaseModel):
    skill_tags: Optional[List[str]] = None
    budget_lower_bound: Optional[float] = None
    budget_upper_bound: Optional[float] = None
    limit: Optional[int] = 50


@router.post("/developers", response_model=DeveloperProfile)
async def create_developer_profile(
    request: CreateDeveloperProfileRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new developer profile."""
    try:
        profile = await gateway_service.user_client.create_developer_profile(
            display_name=request.display_name,
            email=request.email,
            skill_tags=request.skill_tags,
            hourly_rate=request.hourly_rate
        )
        
        return DeveloperProfile(**profile)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create developer profile: {str(e)}")


@router.put("/developers/{user_id}")
async def update_developer_profile(
    user_id: str,
    request: UpdateDeveloperProfileRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update developer profile."""
    try:
        # Check if user is updating their own profile or is admin
        if current_user["user_id"] != user_id and current_user.get("user_type") != "ADMIN":
            raise HTTPException(status_code=403, detail="Access denied")
        
        await gateway_service.user_client.update_developer_profile(
            user_id=user_id,
            skill_tags=request.skill_tags,
            hourly_rate=request.hourly_rate,
            bio=request.bio or "",
            links=request.links or []
        )
        
        return {"message": "Developer profile updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update developer profile: {str(e)}")


@router.put("/developers/{user_id}/presence")
async def update_presence(
    user_id: str,
    request: UpdatePresenceRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user presence status."""
    try:
        # Check if user is updating their own presence or is admin
        if current_user["user_id"] != user_id and current_user.get("user_type") != "ADMIN":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate presence status
        valid_statuses = ["OFFLINE", "IDLE", "SEARCHING"]
        if request.presence not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid presence status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        await gateway_service.user_client.update_presence(
            user_id=user_id,
            presence=request.presence
        )
        
        return {"message": "Presence updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update presence: {str(e)}")


@router.get("/developers", response_model=List[DeveloperProfile])
async def list_online_developers(
    skill_tags: Optional[List[str]] = Query(None),
    budget_lower_bound: Optional[float] = Query(None),
    budget_upper_bound: Optional[float] = Query(None),
    limit: Optional[int] = Query(50, ge=1, le=100),
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List online developers with optional filtering."""
    try:
        developers = await gateway_service.user_client.list_online_developers(
            skill_tags=skill_tags or [],
            budget_lower_bound=budget_lower_bound or 0.0,
            budget_upper_bound=budget_upper_bound or 10000.0,
            limit=limit
        )
        
        return [DeveloperProfile(**dev) for dev in developers]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list developers: {str(e)}")


@router.get("/developers/{user_id}", response_model=DeveloperProfile)
async def get_developer_profile(
    user_id: str,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get developer profile by ID."""
    try:
        # This would need to be implemented in the User Service
        # For now, we'll return a mock response
        raise HTTPException(status_code=501, detail="Not implemented yet")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get developer profile: {str(e)}")


@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get current user's profile."""
    return current_user
