"""User Service client for gRPC communication."""

from typing import List, Optional, Dict, Any
import grpc
from google.protobuf.timestamp_pb2 import Timestamp

from app.services.base import BaseServiceClient
from app.exceptions import ServiceUnavailableException

# Import generated protobuf classes
# Note: These would be generated from the proto files
# For now, we'll create mock classes

class UserServiceStub:
    """Mock UserService stub - replace with generated code."""
    pass

class CreateDeveloperProfileRequest:
    def __init__(self, display_name: str, email: str, skill_tags: List[str], hourly_rate: float):
        self.display_name = display_name
        self.email = email
        self.skill_tags = skill_tags
        self.hourly_rate = hourly_rate

class CreateDeveloperProfileResponse:
    def __init__(self, profile: Dict[str, Any]):
        self.profile = profile

class UpdateDeveloperProfileRequest:
    def __init__(self, user_id: str, skill_tags: List[str], hourly_rate: float, bio: str, links: List[str]):
        self.user_id = user_id
        self.skill_tags = skill_tags
        self.hourly_rate = hourly_rate
        self.bio = bio
        self.links = links

class UpdatePresenceRequest:
    def __init__(self, user_id: str, presence: str):
        self.user_id = user_id
        self.presence = presence

class ListOnlineDevelopersRequest:
    def __init__(self, skill_tags: List[str], budget_lower_bound: float, budget_upper_bound: float, limit: int):
        self.skill_tags = skill_tags
        self.budget_lower_bound = budget_lower_bound
        self.budget_upper_bound = budget_upper_bound
        self.limit = limit

class ListOnlineDevelopersResponse:
    def __init__(self, developers: List[Dict[str, Any]]):
        self.developers = developers


class UserServiceClient(BaseServiceClient):
    """Client for User Service gRPC API."""
    
    def __init__(self, settings):
        super().__init__(settings.user_service_url)
        self.settings = settings
    
    @property
    def service_name(self) -> str:
        return "user-service"
    
    @property
    def stub_class(self):
        return UserServiceStub
    
    async def initialize(self):
        """Initialize the service client."""
        pass
    
    async def shutdown(self):
        """Shutdown the service client."""
        await self.close()
    
    async def create_developer_profile(
        self,
        display_name: str,
        email: str,
        skill_tags: List[str],
        hourly_rate: float
    ) -> Dict[str, Any]:
        """Create a new developer profile."""
        request = CreateDeveloperProfileRequest(
            display_name=display_name,
            email=email,
            skill_tags=skill_tags,
            hourly_rate=hourly_rate
        )
        
        response = await self._call_with_retry("CreateDeveloperProfile", request)
        return response.profile
    
    async def update_developer_profile(
        self,
        user_id: str,
        skill_tags: List[str],
        hourly_rate: float,
        bio: str = "",
        links: List[str] = None
    ) -> None:
        """Update developer profile."""
        if links is None:
            links = []
            
        request = UpdateDeveloperProfileRequest(
            user_id=user_id,
            skill_tags=skill_tags,
            hourly_rate=hourly_rate,
            bio=bio,
            links=links
        )
        
        await self._call_with_retry("UpdateDeveloperProfile", request)
    
    async def update_presence(
        self,
        user_id: str,
        presence: str
    ) -> None:
        """Update user presence status."""
        request = UpdatePresenceRequest(
            user_id=user_id,
            presence=presence
        )
        
        await self._call_with_retry("UpdatePresence", request)
    
    async def list_online_developers(
        self,
        skill_tags: List[str] = None,
        budget_lower_bound: float = 0.0,
        budget_upper_bound: float = 10000.0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List online developers with filtering."""
        if skill_tags is None:
            skill_tags = []
            
        request = ListOnlineDevelopersRequest(
            skill_tags=skill_tags,
            budget_lower_bound=budget_lower_bound,
            budget_upper_bound=budget_upper_bound,
            limit=limit
        )
        
        response = await self._call_with_retry("ListOnlineDevelopers", request)
        return response.developers
    
    async def health_check(self) -> bool:
        """Check if User Service is healthy."""
        try:
            # Try to list developers with minimal parameters
            await self.list_online_developers(limit=1)
            return True
        except Exception:
            return False
