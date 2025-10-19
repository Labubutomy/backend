"""Recommendation Service client for gRPC communication."""

from typing import List, Optional, Dict, Any
from google.protobuf.timestamp_pb2 import Timestamp

from app.services.base import BaseServiceClient

# Import generated protobuf classes
# Note: These would be generated from the proto files
# For now, we'll create mock classes

class RecommendationServiceStub:
    """Mock RecommendationService stub - replace with generated code."""
    pass

class TaskContext:
    def __init__(
        self,
        task_id: str,
        skill_tags: List[str],
        budget_lower_bound: float,
        budget_upper_bound: float,
        title: str,
        description: str,
        locale: str = "en",
        priority: int = 1,
        embedding_vector: List[float] = None,
        metadata: Dict[str, str] = None
    ):
        self.task_id = task_id
        self.skill_tags = skill_tags
        self.budget_lower_bound = budget_lower_bound
        self.budget_upper_bound = budget_upper_bound
        self.title = title
        self.description = description
        self.locale = locale
        self.priority = priority
        self.embedding_vector = embedding_vector or []
        self.metadata = metadata or {}

class CandidateContext:
    def __init__(
        self,
        user_id: str,
        skill_tags: List[str],
        hourly_rate: float,
        rating: float,
        response_rate: float = 1.0,
        acceptance_rate: float = 1.0,
        avg_response_time_hours: float = 24.0,
        embedding_vector: List[float] = None,
        last_active_at: Timestamp = None,
        timezone: str = "UTC",
        preferred_domains: List[str] = None,
        skill_confidence: Dict[str, float] = None
    ):
        self.user_id = user_id
        self.skill_tags = skill_tags
        self.hourly_rate = hourly_rate
        self.rating = rating
        self.response_rate = response_rate
        self.acceptance_rate = acceptance_rate
        self.avg_response_time_hours = avg_response_time_hours
        self.embedding_vector = embedding_vector or []
        self.last_active_at = last_active_at
        self.timezone = timezone
        self.preferred_domains = preferred_domains or []
        self.skill_confidence = skill_confidence or {}

class ScoringStrategy:
    def __init__(self, name: str, parameters: Dict[str, float] = None):
        self.name = name
        self.parameters = parameters or {}

class ScoreTaskCandidatesRequest:
    def __init__(
        self,
        task: TaskContext,
        candidates: List[CandidateContext],
        limit: int = 10,
        strategy: ScoringStrategy = None,
        weights: Dict[str, float] = None
    ):
        self.task = task
        self.candidates = candidates
        self.limit = limit
        self.strategy = strategy or ScoringStrategy("balanced")
        self.weights = weights or {}

class CandidateScore:
    def __init__(
        self,
        user_id: str,
        score: float,
        breakdown: Dict[str, float] = None,
        reasons: List[str] = None
    ):
        self.user_id = user_id
        self.score = score
        self.breakdown = breakdown or {}
        self.reasons = reasons or []

class ScoreBreakdown:
    def __init__(
        self,
        skill_match_score: float = 0.0,
        embedding_similarity: float = 0.0,
        rating_score: float = 0.0,
        responsiveness_score: float = 0.0,
        availability_score: float = 0.0,
        price_compatibility: float = 0.0,
        diversity_bonus: float = 0.0
    ):
        self.skill_match_score = skill_match_score
        self.embedding_similarity = embedding_similarity
        self.rating_score = rating_score
        self.responsiveness_score = responsiveness_score
        self.availability_score = availability_score
        self.price_compatibility = price_compatibility
        self.diversity_bonus = diversity_bonus

class ScoringMetadata:
    def __init__(
        self,
        total_candidates_evaluated: int = 0,
        scoring_duration_ms: int = 0,
        strategy_used: str = "",
        weights_applied: Dict[str, float] = None
    ):
        self.total_candidates_evaluated = total_candidates_evaluated
        self.scoring_duration_ms = scoring_duration_ms
        self.strategy_used = strategy_used
        self.weights_applied = weights_applied or {}

class ScoreTaskCandidatesResponse:
    def __init__(self, scores: List[CandidateScore], metadata: ScoringMetadata = None):
        self.scores = scores
        self.metadata = metadata or ScoringMetadata()

class FilterCriteria:
    def __init__(
        self,
        min_rating: float = 0.0,
        max_hourly_rate: float = 10000.0,
        required_skills: List[str] = None,
        excluded_skills: List[str] = None,
        online_only: bool = False,
        max_hours_since_active: int = 168,  # 1 week
        timezone_preference: str = None
    ):
        self.min_rating = min_rating
        self.max_hourly_rate = max_hourly_rate
        self.required_skills = required_skills or []
        self.excluded_skills = excluded_skills or []
        self.online_only = online_only
        self.max_hours_since_active = max_hours_since_active
        self.timezone_preference = timezone_preference

class FilterCandidatesRequest:
    def __init__(
        self,
        task: TaskContext,
        candidate_user_ids: List[str],
        criteria: FilterCriteria
    ):
        self.task = task
        self.candidate_user_ids = candidate_user_ids
        self.criteria = criteria

class FilterCandidatesResponse:
    def __init__(self, filtered_user_ids: List[str], total_filtered: int = 0):
        self.filtered_user_ids = filtered_user_ids
        self.total_filtered = total_filtered

class HealthResponse:
    def __init__(self, healthy: bool = True, status: str = "ok", checks: Dict[str, str] = None):
        self.healthy = healthy
        self.status = status
        self.checks = checks or {}


class RecommendationServiceClient(BaseServiceClient):
    """Client for Recommendation Service gRPC API."""
    
    def __init__(self, settings):
        super().__init__(settings.recommendation_service_url)
        self.settings = settings
    
    @property
    def service_name(self) -> str:
        return "recommendation-service"
    
    @property
    def stub_class(self):
        return RecommendationServiceStub
    
    async def initialize(self):
        """Initialize the service client."""
        pass
    
    async def shutdown(self):
        """Shutdown the service client."""
        await self.close()
    
    async def score_task_candidates(
        self,
        task: TaskContext,
        candidates: List[CandidateContext],
        limit: int = 10,
        strategy: str = "balanced",
        weights: Dict[str, float] = None
    ) -> List[CandidateScore]:
        """Score task candidates and return ranked results."""
        scoring_strategy = ScoringStrategy(name=strategy, parameters=weights or {})
        
        request = ScoreTaskCandidatesRequest(
            task=task,
            candidates=candidates,
            limit=limit,
            strategy=scoring_strategy,
            weights=weights
        )
        
        response = await self._call_with_retry("ScoreTaskCandidates", request)
        return response.scores
    
    async def filter_candidates(
        self,
        task: TaskContext,
        candidate_user_ids: List[str],
        criteria: FilterCriteria
    ) -> List[str]:
        """Filter candidates based on criteria."""
        request = FilterCandidatesRequest(
            task=task,
            candidate_user_ids=candidate_user_ids,
            criteria=criteria
        )
        
        response = await self._call_with_retry("FilterCandidates", request)
        return response.filtered_user_ids
    
    async def health_check(self) -> bool:
        """Check if Recommendation Service is healthy."""
        try:
            request = HealthResponse()
            response = await self._call_with_retry("Health", request)
            return response.healthy
        except Exception:
            return False
