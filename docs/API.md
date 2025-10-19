# API Documentation

## Overview

The Freelance Platform provides three main gRPC services for managing users, tasks, and matching workflows. All services support both gRPC and HTTP/JSON via gRPC-Gateway.

## Base URLs

- **User Service**: `localhost:50051`
- **Task Service**: `localhost:50052`  
- **Orchestrator**: `localhost:50053`

## Authentication

All services use JWT-based authentication. Include the JWT token in gRPC metadata:

```go
md := metadata.Pairs("authorization", "Bearer "+token)
ctx := metadata.NewOutgoingContext(context.Background(), md)
```

## User Service API

### Authentication

#### CreateUser

Creates a new user account.

**gRPC Method**: `platform.users.v1.UserService/CreateUser`

**Request**:

```protobuf
message CreateUserRequest {
  string email = 1;
  string password = 2;
  string full_name = 3;
  UserType user_type = 4;  // CLIENT or DEVELOPER
}
```

**Response**:

```protobuf
message CreateUserResponse {
  string user_id = 1;
  string access_token = 2;
  string refresh_token = 3;
  User user = 4;
}
```

**Example**:

```bash
grpcurl -plaintext -d '{
  "email": "developer@example.com",
  "password": "SecurePassword123",
  "full_name": "John Developer",
  "user_type": "DEVELOPER"
}' localhost:50051 platform.users.v1.UserService/CreateUser
```

#### AuthenticateUser

Authenticates user and returns access tokens.

**gRPC Method**: `platform.users.v1.UserService/AuthenticateUser`

**Request**:

```protobuf
message AuthenticateUserRequest {
  string email = 1;
  string password = 2;
}
```

**Response**:

```protobuf
message AuthenticateUserResponse {
  string access_token = 1;
  string refresh_token = 2;
  User user = 3;
}
```

### User Management

#### GetUserProfile

Retrieves user profile by ID.

**gRPC Method**: `platform.users.v1.UserService/GetUserProfile`

**Request**:

```protobuf
message GetUserProfileRequest {
  string user_id = 1;
}
```

**Response**:

```protobuf
message GetUserProfileResponse {
  User user = 1;
}

message User {
  string user_id = 1;
  string email = 2;
  string full_name = 3;
  UserType user_type = 4;
  repeated string skill_tags = 5;
  double hourly_rate = 6;
  double rating = 7;
  bool is_online = 8;
  google.protobuf.Timestamp created_at = 9;
  google.protobuf.Timestamp updated_at = 10;
}
```

#### UpdateUserProfile

Updates user profile information.

**gRPC Method**: `platform.users.v1.UserService/UpdateUserProfile`

**Request**:

```protobuf
message UpdateUserProfileRequest {
  string user_id = 1;
  string full_name = 2;
  repeated string skill_tags = 3;
  double hourly_rate = 4;
  string bio = 5;
}
```

**Response**:

```protobuf
message UpdateUserProfileResponse {
  User user = 1;
}
```

#### SetUserOnlineStatus

Updates user's online presence.

**gRPC Method**: `platform.users.v1.UserService/SetUserOnlineStatus`

**Request**:

```protobuf
message SetUserOnlineStatusRequest {
  string user_id = 1;
  bool is_online = 2;
}
```

**Response**:

```protobuf
message SetUserOnlineStatusResponse {
  bool success = 1;
}
```

### Developer Discovery

#### ListOnlineDevelopers

Finds available developers based on criteria.

**gRPC Method**: `platform.users.v1.UserService/ListOnlineDevelopers`

**Request**:

```protobuf
message ListOnlineDevelopersRequest {
  repeated string skill_tags = 1;
  double budget_lower_bound = 2;
  double budget_upper_bound = 3;
  int32 limit = 4;
  int32 offset = 5;
}
```

**Response**:

```protobuf
message ListOnlineDevelopersResponse {
  repeated User developers = 1;
  int32 total_count = 2;
}
```

**Example**:

```bash
grpcurl -plaintext -d '{
  "skill_tags": ["golang", "postgresql"],
  "budget_lower_bound": 50,
  "budget_upper_bound": 150,
  "limit": 10
}' localhost:50051 platform.users.v1.UserService/ListOnlineDevelopers
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ARGUMENT` | Invalid request parameters |
| `ALREADY_EXISTS` | Email already registered |
| `UNAUTHENTICATED` | Invalid credentials |
| `NOT_FOUND` | User not found |
| `INTERNAL` | Internal server error |

## Task Service API

### Task Management

#### CreateTask

Creates a new task posting.

**gRPC Method**: `platform.tasks.v1.TaskService/CreateTask`

**Request**:

```protobuf
message CreateTaskRequest {
  string client_id = 1;
  string title = 2;
  string description = 3;
  repeated string skill_tags = 4;
  double budget_lower_bound = 5;
  double budget_upper_bound = 6;
  int32 estimated_hours = 7;
  google.protobuf.Timestamp deadline = 8;
}
```

**Response**:

```protobuf
message CreateTaskResponse {
  string task_id = 1;
  Task task = 2;
}

message Task {
  string task_id = 1;
  string client_id = 2;
  string title = 3;
  string description = 4;
  repeated string skill_tags = 5;
  double budget_lower_bound = 6;
  double budget_upper_bound = 7;
  int32 estimated_hours = 8;
  TaskStatus status = 9;
  google.protobuf.Timestamp deadline = 10;
  google.protobuf.Timestamp created_at = 11;
  google.protobuf.Timestamp updated_at = 12;
}

enum TaskStatus {
  OPEN = 0;
  IN_PROGRESS = 1;
  COMPLETED = 2;
  CANCELLED = 3;
}
```

**Example**:

```bash
grpcurl -plaintext -d '{
  "client_id": "user-123",
  "title": "Build REST API",
  "description": "Need a Go REST API with PostgreSQL",
  "skill_tags": ["golang", "postgresql", "rest-api"],
  "budget_lower_bound": 1000,
  "budget_upper_bound": 2500,
  "estimated_hours": 40
}' localhost:50052 platform.tasks.v1.TaskService/CreateTask
```

#### GetTask

Retrieves task by ID.

**gRPC Method**: `platform.tasks.v1.TaskService/GetTask`

**Request**:

```protobuf
message GetTaskRequest {
  string task_id = 1;
}
```

**Response**:

```protobuf
message GetTaskResponse {
  Task task = 1;
}
```

#### UpdateTask

Updates task information.

**gRPC Method**: `platform.tasks.v1.TaskService/UpdateTask`

**Request**:

```protobuf
message UpdateTaskRequest {
  string task_id = 1;
  string title = 2;
  string description = 3;
  repeated string skill_tags = 4;
  double budget_lower_bound = 5;
  double budget_upper_bound = 6;
  TaskStatus status = 7;
}
```

**Response**:

```protobuf
message UpdateTaskResponse {
  Task task = 1;
}
```

#### ListTasks

Lists tasks with filtering and pagination.

**gRPC Method**: `platform.tasks.v1.TaskService/ListTasks`

**Request**:

```protobuf
message ListTasksRequest {
  string client_id = 1;        // Filter by client
  TaskStatus status = 2;       // Filter by status
  repeated string skill_tags = 3;  // Filter by required skills
  int32 limit = 4;
  int32 offset = 5;
}
```

**Response**:

```protobuf
message ListTasksResponse {
  repeated Task tasks = 1;
  int32 total_count = 2;
}
```

### Task Events

The Task Service publishes events to NATS for task lifecycle:

#### task.created

Published when a new task is created.

**Subject**: `task.created`

**Payload**:

```protobuf
message TaskCreated {
  string task_id = 1;
  string client_id = 2;
  string title = 3;
  repeated string skill_tags = 4;
  double budget_lower_bound = 5;
  double budget_upper_bound = 6;
  google.protobuf.Timestamp created_at = 7;
}
```

#### task.updated

Published when task is modified.

**Subject**: `task.updated`

**Payload**:

```protobuf
message TaskUpdated {
  string task_id = 1;
  TaskStatus old_status = 2;
  TaskStatus new_status = 3;
  google.protobuf.Timestamp updated_at = 4;
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ARGUMENT` | Invalid request parameters |
| `NOT_FOUND` | Task not found |
| `PERMISSION_DENIED` | User cannot access task |
| `FAILED_PRECONDITION` | Task state prevents operation |
| `INTERNAL` | Internal server error |

## Orchestrator API

### Matching System

#### FindSuitableDevelopers

Finds developers matching task requirements.

**gRPC Method**: `platform.matching.v1.RecommendationService/FindSuitableDevelopers`

**Request**:

```protobuf
message FindSuitableDevelopersRequest {
  string task_id = 1;
  repeated string skill_tags = 2;
  double budget_lower_bound = 3;
  double budget_upper_bound = 4;
  int32 limit = 5;
}
```

**Response**:

```protobuf
message FindSuitableDevelopersResponse {
  repeated DeveloperMatch matches = 1;
}

message DeveloperMatch {
  User developer = 1;
  double match_score = 2;
  string strategy_used = 3;
}
```

#### CreateProposal

Creates a task proposal for a developer.

**gRPC Method**: `platform.matching.v1.RecommendationService/CreateProposal`

**Request**:

```protobuf
message CreateProposalRequest {
  string task_id = 1;
  string developer_id = 2;
  double match_score = 3;
  string strategy_used = 4;
}
```

**Response**:

```protobuf
message CreateProposalResponse {
  string proposal_id = 1;
  Proposal proposal = 2;
}

message Proposal {
  string proposal_id = 1;
  string task_id = 2;
  string developer_id = 3;
  double match_score = 4;
  ProposalStatus status = 5;
  string strategy_used = 6;
  google.protobuf.Timestamp expires_at = 7;
  google.protobuf.Timestamp created_at = 8;
}

enum ProposalStatus {
  PROPOSED = 0;
  ACCEPTED = 1;
  REJECTED = 2;
  EXPIRED = 3;
}
```

### Matching Events

#### match.proposed

Published when orchestrator creates a proposal.

**Subject**: `match.proposed`

**Payload**:

```protobuf
message MatchProposed {
  string proposal_id = 1;
  string task_id = 2;
  string developer_id = 3;
  double match_score = 4;
  google.protobuf.Timestamp created_at = 5;
}
```

### Scoring Algorithm

The orchestrator uses a weighted scoring algorithm:

```
Final Score = (0.5 × Skill Score) + (0.3 × Budget Score) + (0.2 × Rating Score)
```

Where:

- **Skill Score**: `matching_skills / required_skills`
- **Budget Score**: `1 - |developer_rate - budget_midpoint| / budget_midpoint`
- **Rating Score**: `developer_rating / 5.0`

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ARGUMENT` | Invalid request parameters |
| `NOT_FOUND` | Task or developer not found |
| `FAILED_PRECONDITION` | No suitable developers found |
| `INTERNAL` | Internal server error |

## Common Data Types

### User Types

```protobuf
enum UserType {
  CLIENT = 0;      // Task posters
  DEVELOPER = 1;   // Task workers
}
```

### Timestamps

All timestamps use `google.protobuf.Timestamp` format:

```json
{
  "created_at": "2024-10-19T15:30:00Z"
}
```

### Error Response Format

All services return gRPC status codes with details:

```json
{
  "code": 3,
  "message": "Task not found",
  "details": [
    {
      "type": "google.rpc.ErrorInfo",
      "reason": "TASK_NOT_FOUND",
      "domain": "platform.tasks.v1"
    }
  ]
}
```

## SDK and Client Libraries

### Go Client Example

```go
package main

import (
    "context"
    "log"
    
    "google.golang.org/grpc"
    usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
)

func main() {
    // Connect to User Service
    conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()
    
    client := usersv1.NewUserServiceClient(conn)
    
    // Create user
    resp, err := client.CreateUser(context.Background(), &usersv1.CreateUserRequest{
        Email:    "developer@example.com",
        Password: "SecurePassword123",
        FullName: "John Developer",
        UserType: usersv1.UserType_DEVELOPER,
    })
    if err != nil {
        log.Fatal(err)
    }
    
    log.Printf("Created user: %s", resp.UserId)
}
```

### JavaScript/TypeScript Client

```javascript
import { UserServiceClient } from './proto/platform/users/v1/user_service_grpc_pb';
import { CreateUserRequest, UserType } from './proto/platform/users/v1/user_service_pb';

const client = new UserServiceClient('http://localhost:50051');

const request = new CreateUserRequest();
request.setEmail('developer@example.com');
request.setPassword('SecurePassword123');
request.setFullName('John Developer');
request.setUserType(UserType.DEVELOPER);

client.createUser(request, (err, response) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Created user:', response.getUserId());
});
```

### Python Client

```python
import grpc
from proto.platform.users.v1 import user_service_pb2, user_service_pb2_grpc

# Create channel
channel = grpc.insecure_channel('localhost:50051')
stub = user_service_pb2_grpc.UserServiceStub(channel)

# Create user
request = user_service_pb2.CreateUserRequest(
    email='developer@example.com',
    password='SecurePassword123',
    full_name='John Developer',
    user_type=user_service_pb2.UserType.DEVELOPER
)

response = stub.CreateUser(request)
print(f'Created user: {response.user_id}')
```

## Testing APIs

### Using grpcurl

```bash
# List available services
grpcurl -plaintext localhost:50051 list

# List service methods
grpcurl -plaintext localhost:50051 list platform.users.v1.UserService

# Call with JSON payload
grpcurl -plaintext -d @request.json localhost:50051 platform.users.v1.UserService/CreateUser
```

### Using Postman

1. Import the proto files
2. Configure gRPC connection to `localhost:50051`
3. Select method and fill request body
4. Send request and view response

### Load Testing with k6

```javascript
import grpc from 'k6/net/grpc';
import { check } from 'k6';

const client = new grpc.Client();
client.load(['../proto'], 'platform/users/v1/user_service.proto');

export default () => {
  client.connect('localhost:50051', { plaintext: true });
  
  const response = client.invoke('platform.users.v1.UserService/ListOnlineDevelopers', {
    skill_tags: ['golang'],
    budget_lower_bound: 50,
    budget_upper_bound: 150,
    limit: 10
  });
  
  check(response, {
    'status is OK': (r) => r && r.status === grpc.StatusOK,
    'has developers': (r) => r && r.message.developers.length > 0,
  });
  
  client.close();
};
```

## Rate Limiting

All services implement rate limiting:

- **Authenticated requests**: 1000 requests/minute per user
- **Unauthenticated requests**: 100 requests/minute per IP
- **Bulk operations**: 10 requests/minute per user

Rate limit headers in HTTP responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1571797419
```

## Webhooks

### Task Events Webhook

Register webhook URL to receive task events:

**POST** `/webhooks/tasks`

Payload:

```json
{
  "event": "task.created",
  "timestamp": "2024-10-19T15:30:00Z",
  "data": {
    "task_id": "task-123",
    "client_id": "user-456",
    "title": "Build REST API"
  }
}
```

### Match Events Webhook

**POST** `/webhooks/matches`

Payload:

```json
{
  "event": "match.proposed", 
  "timestamp": "2024-10-19T15:35:00Z",
  "data": {
    "proposal_id": "proposal-789",
    "task_id": "task-123",
    "developer_id": "user-456",
    "match_score": 0.85
  }
}
```

## API Versioning

- Current version: `v1`
- Version is specified in proto package: `platform.users.v1`
- Backward compatibility maintained within major version
- New versions: `v2`, `v3`, etc.

## Support

- **Documentation**: This guide and inline proto comments
- **Example Code**: See `examples/` directory
- **Issues**: GitHub repository issues
- **Response Time**: API responses typically < 100ms

---

**Next**: See [OPERATIONS.md](./OPERATIONS.md) for production operations and monitoring.