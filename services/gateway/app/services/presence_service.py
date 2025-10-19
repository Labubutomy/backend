"""Presence Service client for HTTP communication."""

from typing import List, Optional, Dict, Any

from app.services.base import BaseHTTPClient
from app.config import Settings


class PresenceServiceClient(BaseHTTPClient):
    """Client for Presence Service HTTP API."""
    
    def __init__(self, settings: Settings):
        super().__init__(settings.presence_service_url)
        self.settings = settings
    
    @property
    def service_name(self) -> str:
        return "presence-service"
    
    async def initialize(self):
        """Initialize the service client."""
        pass
    
    async def shutdown(self):
        """Shutdown the service client."""
        pass
    
    async def update_presence(
        self,
        user_id: str,
        status: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Update user presence status."""
        data = {
            "user_id": user_id,
            "status": status
        }
        if metadata:
            data["metadata"] = metadata
        
        return await self._make_request("POST", "/api/v1/presence", data)
    
    async def get_presence(self, user_id: str) -> Dict[str, Any]:
        """Get user presence status."""
        return await self._make_request("GET", f"/api/v1/presence/{user_id}")
    
    async def list_online_users(
        self,
        user_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List online users."""
        params = {"limit": limit}
        if user_type:
            params["user_type"] = user_type
        
        # Convert params to query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        endpoint = f"/api/v1/presence/online?{query_string}"
        
        return await self._make_request("GET", endpoint)
    
    async def get_user_activity(
        self,
        user_id: str,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Get user activity for the last N hours."""
        return await self._make_request(
            "GET",
            f"/api/v1/presence/{user_id}/activity?hours={hours}"
        )
    
    async def health_check(self) -> bool:
        """Check if Presence Service is healthy."""
        try:
            response = await self._make_request("GET", "/health")
            return response is not None
        except Exception:
            return False
