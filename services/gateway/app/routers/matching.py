"""Matching router for task-developer matching."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.services.gateway_service import GatewayService
from app.middleware.auth import get_current_user, require_client
from app.dependencies import get_gateway_service

router = APIRouter()


class CandidateScore(BaseModel):
    user_id: str
    score: float
    breakdown: Dict[str, float]
    reasons: List[str]


class MatchingRequest(BaseModel):
    task_id: str
    skill_tags: List[str]
    budget_lower_bound: float
    budget_upper_bound: float
    title: str
    description: str
    limit: Optional[int] = 10
    strategy: Optional[str] = "balanced"


class MatchingResponse(BaseModel):
    candidates: List[CandidateScore]
    metadata: Dict[str, Any]


class FilterCandidatesRequest(BaseModel):
    task_id: str
    skill_tags: List[str]
    budget_lower_bound: float
    budget_upper_bound: float
    title: str
    description: str
    candidate_user_ids: List[str]
    min_rating: Optional[float] = 0.0
    max_hourly_rate: Optional[float] = 10000.0
    required_skills: Optional[List[str]] = None
    online_only: Optional[bool] = False


class FilterCandidatesResponse(BaseModel):
    filtered_user_ids: List[str]
    total_filtered: int


@router.post("/score", response_model=MatchingResponse)
async def score_task_candidates(
    request: MatchingRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(require_client())
):
    """Score task candidates and return ranked results."""
    try:
        # First get the task to verify ownership
        task = await gateway_service.task_client.get_task(request.task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get online developers
        developers = await gateway_service.user_client.list_online_developers(
            skill_tags=request.skill_tags,
            budget_lower_bound=request.budget_lower_bound,
            budget_upper_bound=request.budget_upper_bound,
            limit=100  # Get more candidates for scoring
        )
        
        if not developers:
            return MatchingResponse(
                candidates=[],
                metadata={"message": "No developers found matching criteria"}
            )
        
        # Convert developers to candidate contexts
        from app.services.recommendation_service import (
            TaskContext, CandidateContext, ScoreBreakdown
        )
        
        task_context = TaskContext(
            task_id=request.task_id,
            skill_tags=request.skill_tags,
            budget_lower_bound=request.budget_lower_bound,
            budget_upper_bound=request.budget_upper_bound,
            title=request.title,
            description=request.description
        )
        
        candidate_contexts = []
        for dev in developers:
            candidate_contexts.append(CandidateContext(
                user_id=dev["user_id"],
                skill_tags=dev.get("skill_tags", []),
                hourly_rate=dev.get("hourly_rate", 0.0),
                rating=dev.get("rating", 0.0)
            ))
        
        # Score candidates
        scores = await gateway_service.recommendation_service.score_task_candidates(
            task=task_context,
            candidates=candidate_contexts,
            limit=request.limit,
            strategy=request.strategy
        )
        
        # Convert scores to response format
        candidate_scores = []
        for score in scores:
            candidate_scores.append(CandidateScore(
                user_id=score.user_id,
                score=score.score,
                breakdown=score.breakdown,
                reasons=score.reasons
            ))
        
        return MatchingResponse(
            candidates=candidate_scores,
            metadata={
                "total_candidates": len(developers),
                "strategy_used": request.strategy,
                "task_id": request.task_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score candidates: {str(e)}")


@router.post("/filter", response_model=FilterCandidatesResponse)
async def filter_candidates(
    request: FilterCandidatesRequest,
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Filter candidates based on criteria."""
    try:
        # First get the task to verify access
        task = await gateway_service.task_client.get_task(request.task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create task context
        from app.services.recommendation_service import TaskContext, FilterCriteria
        
        task_context = TaskContext(
            task_id=request.task_id,
            skill_tags=request.skill_tags,
            budget_lower_bound=request.budget_lower_bound,
            budget_upper_bound=request.budget_upper_bound,
            title=request.title,
            description=request.description
        )
        
        # Create filter criteria
        criteria = FilterCriteria(
            min_rating=request.min_rating,
            max_hourly_rate=request.max_hourly_rate,
            required_skills=request.required_skills or [],
            online_only=request.online_only
        )
        
        # Filter candidates
        filtered_ids = await gateway_service.recommendation_service.filter_candidates(
            task=task_context,
            candidate_user_ids=request.candidate_user_ids,
            criteria=criteria
        )
        
        return FilterCandidatesResponse(
            filtered_user_ids=filtered_ids,
            total_filtered=len(filtered_ids)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to filter candidates: {str(e)}")


@router.get("/recommendations/{task_id}")
async def get_task_recommendations(
    task_id: str,
    limit: Optional[int] = Query(10, ge=1, le=50),
    strategy: Optional[str] = Query("balanced"),
    gateway_service: GatewayService = Depends(get_gateway_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get recommendations for a specific task."""
    try:
        # Get task details
        task = await gateway_service.task_client.get_task(task_id)
        
        # Check if user has access to this task
        if (task["client_id"] != current_user["user_id"] and 
            current_user.get("user_type") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create matching request
        matching_request = MatchingRequest(
            task_id=task_id,
            skill_tags=task["skill_tags"],
            budget_lower_bound=task["budget_lower_bound"],
            budget_upper_bound=task["budget_upper_bound"],
            title=task["title"],
            description=task["description"],
            limit=limit,
            strategy=strategy
        )
        
        # Get recommendations
        response = await score_task_candidates(
            matching_request,
            gateway_service,
            current_user
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.get("/health")
async def matching_health_check(
    gateway_service: GatewayService = Depends(get_gateway_service)
):
    """Check matching service health."""
    try:
        healthy = await gateway_service.recommendation_service.health_check()
        return {
            "status": "healthy" if healthy else "unhealthy",
            "service": "recommendation-service"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "recommendation-service",
            "error": str(e)
        }
