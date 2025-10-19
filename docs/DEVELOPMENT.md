# Development Guide

## Quick Start (5 Minutes Setup)

### Prerequisites

- **Go 1.24.5+**: [Install Go](https://golang.org/doc/install)
- **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Git**: Version control
- **Protocol Buffers**: For gRPC code generation

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/Labubutomy/backend.git
cd backend
make dev
```

This will:

- Start PostgreSQL, NATS, Redis via Docker Compose
- Apply database migrations
- Generate protobuf code
- Build all services
- Display service endpoints

## Development Environment

### 1. Infrastructure Setup

```bash
# Start infrastructure services
make docker-up

# Check services are running
docker-compose ps
```

Expected services:

- **PostgreSQL**: localhost:5432
- **NATS**: localhost:4222  
- **Redis**: localhost:6379
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090

### 2. Service Development

#### Build All Services

```bash
# Generate protobuf + build
make build

# Individual service builds
go build -o bin/userservice ./services/userservice/cmd/userservice
go build -o bin/taskservice ./services/taskservice/cmd/taskservice  
go build -o bin/orchestrator ./services/orchestrator/cmd/orchestrator
```

#### Run Services Locally

```bash
# Terminal 1: User Service
source scripts/setup-env.sh
./bin/userservice

# Terminal 2: Task Service  
source scripts/setup-env.sh
./bin/taskservice

# Terminal 3: Orchestrator
source scripts/setup-env.sh
./bin/orchestrator
```

Or use the convenience script:

```bash
make run-local  # Runs all services in background
```

### 3. Hot Reload Development

For active development with auto-reload:

```bash
# Install air for hot reload
go install github.com/cosmtrek/air@latest

# Run with hot reload (in separate terminals)
cd services/userservice && air
cd services/taskservice && air  
cd services/orchestrator && air
```

## Project Structure

```
backend/
├── cmd/                    # Test utilities and tools
├── docs/                   # Documentation (this directory)
├── migrations/             # Database migrations
├── monitoring/             # Grafana dashboards and Prometheus config
├── pkg/                    # Shared packages
│   ├── logger/            # Structured logging
│   └── runtime/           # gRPC server runtime
├── proto/                 # Protocol buffer definitions
│   ├── platform/          # Service definitions
│   └── gen/go/            # Generated Go code
├── scripts/               # Development scripts
├── services/              # Microservices
│   ├── userservice/       # User management (50051)
│   ├── taskservice/       # Task operations (50052)
│   └── orchestrator/      # Matching engine (50053)
└── tests/                 # Integration and performance tests
```

## Service Architecture

### User Service (Port 50051)

**Responsibilities:**

- User registration and authentication
- Developer profile management  
- Skill and rating tracking
- Online presence management

**Key Files:**

- `services/userservice/cmd/userservice/main.go` - Entry point
- `services/userservice/internal/server/server.go` - gRPC implementation
- `proto/platform/users/v1/user_service.proto` - API definition

**Database Tables:**

- `users` - Core user data
- `user_skills` - Skill associations
- `user_sessions` - Authentication sessions

### Task Service (Port 50052)

**Responsibilities:**

- Task CRUD operations
- Task metadata management
- NATS event publishing for task lifecycle

**Key Files:**

- `services/taskservice/cmd/taskservice/main.go` - Entry point
- `services/taskservice/internal/server/server.go` - gRPC + NATS integration
- `proto/platform/tasks/v1/task_service.proto` - API definition

**Database Tables:**

- `tasks` - Task definitions
- `task_requirements` - Skill requirements
- `task_proposals` - Developer proposals

**NATS Events:**

- `task.created` - Published when task is created
- `task.updated` - Published when task is modified
- `task.completed` - Published when task is finished

### Orchestrator (Port 50053)

**Responsibilities:**

- Task-developer matching algorithm
- Scoring and ranking logic
- Proposal generation and management
- Event-driven processing

**Key Files:**

- `services/orchestrator/cmd/orchestrator/main.go` - Entry point
- `services/orchestrator/internal/server/server.go` - Matching logic
- `services/orchestrator/internal/app/app.go` - Application setup

**Matching Algorithm:**

```go
func calculateMatchScore(task *TaskCreated, developer *Developer) float64 {
    // 50% skill compatibility
    skillScore := float64(len(intersection(task.SkillTags, developer.SkillTags))) / float64(len(task.SkillTags))
    
    // 30% budget alignment  
    budgetMid := (task.BudgetLowerBound + task.BudgetUpperBound) / 2
    budgetScore := 1.0 - math.Abs(developer.HourlyRate - budgetMid) / budgetMid
    
    // 20% developer rating
    ratingScore := developer.Rating / 5.0
    
    return 0.5*skillScore + 0.3*budgetScore + 0.2*ratingScore
}
```

## Development Workflows

### 1. Adding New gRPC Methods

#### Step 1: Update Protocol Buffer

```protobuf
// proto/platform/users/v1/user_service.proto
service UserService {
  rpc GetUserProfile(GetUserProfileRequest) returns (GetUserProfileResponse);
  rpc UpdateUserSkills(UpdateUserSkillsRequest) returns (UpdateUserSkillsResponse); // New method
}

message UpdateUserSkillsRequest {
  string user_id = 1;
  repeated string skill_tags = 2;
}
```

#### Step 2: Generate Code

```bash
make proto-gen
```

#### Step 3: Implement Server Method

```go
// services/userservice/internal/server/server.go
func (s *UserServiceServer) UpdateUserSkills(ctx context.Context, req *usersv1.UpdateUserSkillsRequest) (*usersv1.UpdateUserSkillsResponse, error) {
    // Implementation here
    return &usersv1.UpdateUserSkillsResponse{}, nil
}
```

#### Step 4: Add Tests

```go
// services/userservice/internal/server/server_test.go
func TestUserServiceServer_UpdateUserSkills(t *testing.T) {
    // Test implementation
}
```

### 2. Database Migrations

#### Create Migration

```bash
make migrate-create name=add_user_preferences
```

This creates:

- `migrations/XXX_add_user_preferences.up.sql`
- `migrations/XXX_add_user_preferences.down.sql`

#### Write Migration

```sql
-- migrations/003_add_user_preferences.up.sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(user_id),
    notification_email BOOLEAN DEFAULT true,
    notification_push BOOLEAN DEFAULT true,
    preferred_project_types TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

```sql
-- migrations/003_add_user_preferences.down.sql  
DROP TABLE user_preferences;
```

#### Apply Migration

```bash
make migrate-up
```

### 3. NATS Event Integration

#### Publishing Events

```go
// In Task Service
func (s *TaskServiceServer) CreateTask(ctx context.Context, req *tasksv1.CreateTaskRequest) (*tasksv1.CreateTaskResponse, error) {
    // ... create task logic
    
    // Publish event
    event := &eventsv1.TaskCreated{
        TaskId:           taskID,
        ClientId:         req.ClientId,
        Title:           req.Title,
        SkillTags:       req.SkillTags,
        BudgetLowerBound: req.BudgetLowerBound,
        BudgetUpperBound: req.BudgetUpperBound,
        CreatedAt:       timestamppb.Now(),
    }
    
    data, _ := proto.Marshal(event)
    s.natsConn.Publish("task.created", data)
    
    return &tasksv1.CreateTaskResponse{TaskId: taskID}, nil
}
```

#### Subscribing to Events

```go
// In Orchestrator
func (s *OrchestratorServer) setupNATSSubscriptions() {
    s.natsConn.Subscribe("task.created", func(msg *nats.Msg) {
        var event eventsv1.TaskCreated
        if err := proto.Unmarshal(msg.Data, &event); err != nil {
            s.logger.Error("Failed to unmarshal event", "error", err)
            return
        }
        
        s.handleTaskCreated(context.Background(), &event)
    })
}
```

### 4. Testing Strategy

#### Unit Tests

Run individual service tests:

```bash
# User Service tests
cd services/userservice
go test ./... -v -cover

# Task Service tests  
cd services/taskservice
go test ./... -v -cover

# Orchestrator tests
cd services/orchestrator  
go test ./... -v -cover
```

#### Integration Tests

```bash
# Run full integration test suite
go test ./tests/integration/... -v

# Run specific integration test
go test ./tests/integration -run TestTaskCreationFlow -v
```

#### Performance Tests

```bash
# Load testing with k6
make load-test

# Benchmark specific functions
go test -bench=BenchmarkCalculateMatchScore ./services/orchestrator/...
```

### 5. Debugging

#### Enable Debug Logging

```bash
export LOG_LEVEL=debug
export LOG_FORMAT=text  # More readable for development
```

#### Database Debugging

```bash
# Connect to local database
psql -h localhost -U postgres -d freelance_platform

# View recent tasks
SELECT task_id, title, created_at FROM tasks ORDER BY created_at DESC LIMIT 5;

# Check proposals
SELECT * FROM proposals WHERE created_at > NOW() - INTERVAL '1 hour';
```

#### NATS Debugging

```bash
# Monitor NATS messages
nats sub ">" --translate-subject

# Check specific subject
nats sub "task.created"

# Publish test message
nats pub "task.created" '{"task_id":"test-123","title":"Test Task"}'
```

#### gRPC Debugging

Use grpcurl for API testing:

```bash
# Install grpcurl
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List services
grpcurl -plaintext localhost:50051 list

# Call User Service method
grpcurl -plaintext -d '{"email":"test@example.com","password":"password123"}' \
    localhost:50051 platform.users.v1.UserService/CreateUser

# Call Task Service method  
grpcurl -plaintext -d '{"client_id":"user-123","title":"Test Task","skill_tags":["golang"],"budget_lower_bound":1000,"budget_upper_bound":2000}' \
    localhost:50052 platform.tasks.v1.TaskService/CreateTask
```

## Code Style and Standards

### 1. Go Code Standards

Follow standard Go conventions:

```go
// Good: Clear function names and documentation
// CalculateMatchScore computes compatibility score between task and developer
// Returns score from 0.0 (no match) to 1.0 (perfect match)
func CalculateMatchScore(task *TaskCreated, developer *Developer) float64 {
    if len(task.SkillTags) == 0 {
        return 1.0 // No specific skills required
    }
    
    skillIntersection := intersectSkills(task.SkillTags, developer.SkillTags)
    skillScore := float64(len(skillIntersection)) / float64(len(task.SkillTags))
    
    // ... rest of calculation
}
```

### 2. Error Handling

Consistent error handling patterns:

```go
// Service layer - wrap errors with context
func (s *UserServiceServer) GetUser(ctx context.Context, req *usersv1.GetUserRequest) (*usersv1.GetUserResponse, error) {
    user, err := s.userRepo.GetByID(ctx, req.UserId)
    if err != nil {
        if errors.Is(err, repository.ErrUserNotFound) {
            return nil, status.Error(codes.NotFound, "user not found")
        }
        s.logger.Error("Failed to get user", "user_id", req.UserId, "error", err)
        return nil, status.Error(codes.Internal, "internal server error")
    }
    
    return &usersv1.GetUserResponse{User: user}, nil
}
```

### 3. Logging Standards

Use structured logging:

```go
// Good: Structured logging with context
s.logger.Info("Processing TaskCreated event", 
    "task_id", event.TaskId,
    "client_id", event.ClientId, 
    "skill_count", len(event.SkillTags),
    "budget_range", fmt.Sprintf("%d-%d", event.BudgetLowerBound, event.BudgetUpperBound),
)

// Bad: Unstructured logging
log.Printf("Processing task %s for client %s", event.TaskId, event.ClientId)
```

## Performance Optimization

### 1. Database Optimization

#### Connection Pooling

```go
// Configure database connection pool
dbConfig := &pgxpool.Config{
    MaxConns:        25,
    MinConns:        5,
    MaxConnLifetime: time.Hour,
    MaxConnIdleTime: time.Minute * 30,
}
```

#### Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_skill_tags ON users USING gin(skill_tags);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at) WHERE status = 'open';
CREATE INDEX idx_proposals_task_score ON proposals(task_id, score DESC);
```

### 2. gRPC Optimization

```go
// Configure gRPC server with performance options
s := grpc.NewServer(
    grpc.KeepaliveParams(keepalive.ServerParameters{
        MaxConnectionIdle: 15 * time.Second,
        MaxConnectionAge:  30 * time.Second,
    }),
    grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
        MinTime:             5 * time.Second,
        PermitWithoutStream: true,
    }),
)
```

### 3. NATS Optimization

```go
// Configure NATS connection with performance settings
nc, err := nats.Connect(natsURL,
    nats.MaxReconnects(10),
    nats.ReconnectWait(2*time.Second),
    nats.DrainTimeout(10*time.Second),
    nats.MaxPingsOutstanding(3),
)
```

## Troubleshooting Common Issues

### 1. Build Issues

#### Protocol Buffer Generation Fails

```bash
# Ensure protoc is installed
protoc --version

# Reinstall protobuf plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Clean and regenerate
make proto-clean
make proto-gen
```

#### Module Issues

```bash
# Clean module cache
go clean -modcache

# Refresh dependencies  
go mod tidy
go mod download
```

### 2. Runtime Issues

#### Database Connection Problems

```bash
# Test database connectivity
pg_isready -h localhost -p 5432

# Check if database exists
psql -h localhost -U postgres -l | grep freelance_platform

# Recreate database if needed
dropdb -h localhost -U postgres freelance_platform
createdb -h localhost -U postgres freelance_platform
make migrate-up
```

#### NATS Connection Issues

```bash
# Check NATS server status
curl http://localhost:8222/varz

# Restart NATS in Docker
docker-compose restart nats
```

#### Port Conflicts

```bash
# Find processes using ports
lsof -i :50051
lsof -i :50052  
lsof -i :50053

# Kill conflicting processes
pkill -f userservice
pkill -f taskservice
pkill -f orchestrator
```

### 3. Test Issues

#### Database Tests Failing

```bash
# Use test database
export DB_NAME=freelance_platform_test

# Setup test database
createdb -h localhost -U postgres freelance_platform_test
make migrate-up
```

#### NATS Tests Failing

```bash
# Use embedded NATS for tests
go test ./... -tags=embedded_nats
```

## IDE Setup

### VS Code Configuration

Recommended extensions:

- Go (official Google extension)
- Protocol Buffers
- Docker
- Kubernetes
- REST Client

#### Settings.json

```json
{
    "go.useLanguageServer": true,
    "go.toolsManagement.autoUpdate": true,
    "go.lintOnSave": "package",
    "go.formatTool": "goimports",
    "go.testFlags": ["-v", "-race"],
    "protoc.path": "/usr/local/bin/protoc"
}
```

#### Launch Configuration

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch User Service",
            "type": "go", 
            "request": "launch",
            "mode": "auto",
            "program": "./services/userservice/cmd/userservice",
            "env": {
                "LOG_LEVEL": "debug"
            }
        }
    ]
}
```

## Git Workflow

### Branch Strategy

```bash
# Feature development
git checkout -b feature/user-skills-api
# ... make changes
git commit -m "feat: add user skills management API"
git push origin feature/user-skills-api
# Create PR

# Hotfix
git checkout -b hotfix/fix-matching-bug
# ... make changes  
git commit -m "fix: resolve null pointer in matching algorithm"
```

### Commit Messages

Follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes  
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

## Useful Commands

### Development

```bash
# Complete development setup
make dev

# Run tests with coverage
make test-coverage

# Format and lint code
make format
make lint

# Generate and view documentation  
go doc -http=:6060
```

### Debugging

```bash
# View service logs
tail -f userservice.log
tail -f taskservice.log
tail -f orchestrator.log

# Monitor database activity
psql -h localhost -U postgres -d freelance_platform -c "SELECT * FROM pg_stat_activity;"

# Check NATS subscriptions
nats server list
```

### Performance

```bash
# Profile CPU usage
go tool pprof http://localhost:50051/debug/pprof/profile

# Profile memory usage  
go tool pprof http://localhost:50051/debug/pprof/heap

# Benchmark matching algorithm
go test -bench=BenchmarkCalculateMatchScore ./services/orchestrator/internal/server/
```

---

**Next**: See [API.md](./API.md) for complete API documentation and [OPERATIONS.md](./OPERATIONS.md) for production operations.