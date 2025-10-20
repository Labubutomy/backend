"""Task Service client for gRPC communication."""

from typing import List, Optional, Dict, Any
from google.protobuf.timestamp_pb2 import Timestamp

from app.services.base import BaseServiceClient

# Import generated protobuf classes
# Note: These would be generated from the proto files
# For now, we'll create mock classes

class TaskServiceStub:
    """Mock TaskService stub - replace with generated code."""
    pass

class CreateTaskRequest:
    def __init__(
        self,
        client_id: str,
        title: str,
        description: str,
        skill_tags: List[str],
        budget_lower_bound: float,
        budget_upper_bound: float,
        repository_url: str = "",
        priority: int = 1
    ):
        self.client_id = client_id
        self.title = title
        self.description = description
        self.skill_tags = skill_tags
        self.budget_lower_bound = budget_lower_bound
        self.budget_upper_bound = budget_upper_bound
        self.repository_url = repository_url
        self.priority = priority

class CreateTaskResponse:
    def __init__(self, task: Dict[str, Any]):
        self.task = task

class UpdateTaskRequest:
    def __init__(
        self,
        task_id: str,
        title: str = None,
        description: str = None,
        skill_tags: List[str] = None,
        budget_lower_bound: float = None,
        budget_upper_bound: float = None,
        repository_url: str = None,
        status: str = None
    ):
        self.task_id = task_id
        self.title = title
        self.description = description
        self.skill_tags = skill_tags
        self.budget_lower_bound = budget_lower_bound
        self.budget_upper_bound = budget_upper_bound
        self.repository_url = repository_url
        self.status = status

class GetTaskRequest:
    def __init__(self, task_id: str):
        self.task_id = task_id

class GetTaskResponse:
    def __init__(self, task: Dict[str, Any]):
        self.task = task


class TaskServiceClient(BaseServiceClient):
    """Client for Task Service gRPC API."""
    
    def __init__(self, settings):
        super().__init__(settings.task_service_url)
        self.settings = settings
    
    @property
    def service_name(self) -> str:
        return "task-service"
    
    @property
    def stub_class(self):
        return TaskServiceStub
    
    async def initialize(self):
        """Initialize the service client."""
        pass
    
    async def shutdown(self):
        """Shutdown the service client."""
        await self.close()
    
    async def create_task(
        self,
        client_id: str,
        title: str,
        description: str,
        skill_tags: List[str],
        budget_lower_bound: float,
        budget_upper_bound: float,
        repository_url: str = "",
        priority: int = 1
    ) -> Dict[str, Any]:
        """Create a new task."""
        request = CreateTaskRequest(
            client_id=client_id,
            title=title,
            description=description,
            skill_tags=skill_tags,
            budget_lower_bound=budget_lower_bound,
            budget_upper_bound=budget_upper_bound,
            repository_url=repository_url,
            priority=priority
        )
        
        response = await self._call_with_retry("CreateTask", request)
        return response.task
    
    async def update_task(
        self,
        task_id: str,
        title: str = None,
        description: str = None,
        skill_tags: List[str] = None,
        budget_lower_bound: float = None,
        budget_upper_bound: float = None,
        repository_url: str = None,
        status: str = None
    ) -> None:
        """Update an existing task."""
        request = UpdateTaskRequest(
            task_id=task_id,
            title=title,
            description=description,
            skill_tags=skill_tags,
            budget_lower_bound=budget_lower_bound,
            budget_upper_bound=budget_upper_bound,
            repository_url=repository_url,
            status=status
        )
        
        await self._call_with_retry("UpdateTask", request)
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """Get task by ID."""
        request = GetTaskRequest(task_id=task_id)
        response = await self._call_with_retry("GetTask", request)
        return response.task
    
    async def health_check(self) -> bool:
        """Check if Task Service is healthy."""
        try:
            # Try to get a non-existent task to test connection
            # This should return a "not found" error, not a connection error
            try:
                await self.get_task("health-check-test")
            except Exception as e:
                # If it's a "not found" error, the service is healthy
                if "not found" in str(e).lower():
                    return True
                # If it's a connection error, the service is unhealthy
                return False
            return True
        except Exception:
            return False
