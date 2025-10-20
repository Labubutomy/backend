"""Tasks router for task management."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from app.services import GatewayService
from app.middleware.auth import get_current_user, require_client
from app.dependencies import get_gateway_service

router = APIRouter()


class Task(BaseModel):
    task_id: str
    client_id: str
    title: str
    description: str
    skill_tags: List[str]
    budget_lower_bound: float
    budget_upper_bound: float
    repository_url: str
    status: str
    created_at: str
    updated_at: str


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    skill_tags: List[str]
    budget_lower_bound: float
    budget_upper_bound: float
    repository_url: Optional[str] = ""
    priority: Optional[int] = 1


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skill_tags: Optional[List[str]] = None
    budget_lower_bound: Optional[float] = None
    budget_upper_bound: Optional[float] = None
    repository_url: Optional[str] = None
    status: Optional[str] = None


@router.post("/", response_model=Task)
async def create_task(
    request: CreateTaskRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(require_client())
):
    """Create a new task."""
    try:
        # Validate budget range
        if request.budget_lower_bound >= request.budget_upper_bound:
            raise HTTPException(
                status_code=400,
                detail="budget_lower_bound must be less than budget_upper_bound"
            )
        
        # Validate skill tags
        if not request.skill_tags:
            raise HTTPException(
                status_code=400,
                detail="At least one skill tag is required"
            )
        
        task = await gateway_service.task_client.create_task(
            client_id=current_user["user_id"],
            title=request.title,
            description=request.description,
            skill_tags=request.skill_tags,
            budget_lower_bound=request.budget_lower_bound,
            budget_upper_bound=request.budget_upper_bound,
            repository_url=request.repository_url,
            priority=request.priority
        )
        
        return Task(**task)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get task by ID."""
    try:
        task = await gateway_service.task_client.get_task(task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return Task(**task)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task: {str(e)}")


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    request: UpdateTaskRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update task."""
    try:
        # First get the task to check ownership
        task = await gateway_service.task_client.get_task(task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate budget range if both are provided
        if (request.budget_lower_bound is not None and 
            request.budget_upper_bound is not None and
            request.budget_lower_bound >= request.budget_upper_bound):
            raise HTTPException(
                status_code=400,
                detail="budget_lower_bound must be less than budget_upper_bound"
            )
        
        await gateway_service.task_client.update_task(
            task_id=task_id,
            title=request.title,
            description=request.description,
            skill_tags=request.skill_tags,
            budget_lower_bound=request.budget_lower_bound,
            budget_upper_bound=request.budget_upper_bound,
            repository_url=request.repository_url,
            status=request.status
        )
        
        return {"message": "Task updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@router.get("/", response_model=List[Task])
async def list_tasks(
    client_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skill_tags: Optional[List[str]] = Query(None),
    limit: Optional[int] = Query(50, ge=1, le=100),
    offset: Optional[int] = Query(0, ge=0),
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List tasks with optional filtering."""
    try:
        # If client_id is provided, check if user has access
        if client_id and client_id != current_user["user_id"] and current_user.get("user_type") != "ADMIN":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # If no client_id provided, use current user's ID
        if not client_id:
            client_id = current_user["user_id"]
        
        # This would need to be implemented in the Task Service
        # For now, we'll return a mock response
        raise HTTPException(status_code=501, detail="Not implemented yet")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tasks: {str(e)}")


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete task."""
    try:
        # First get the task to check ownership
        task = await gateway_service.task_client.get_task(task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # This would need to be implemented in the Task Service
        raise HTTPException(status_code=501, detail="Not implemented yet")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")
