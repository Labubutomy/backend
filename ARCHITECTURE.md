# Архитектура High-Performance Freelance Platform

## Обзор

Фриланс-платформа с фокусом на минимальную задержку от создания задачи до предложения разработчику (target: **P95 < 500ms**). Архитектура построена на принципах event-driven и stream-first подходов с использованием Go, gRPC, NATS JetStream, Redis и PostgreSQL.

## Ключевые SLA

- **Latency Goal**: P95 время от `task.created` до `proposal.delivered` ≤ 500ms
- **Availability**: 99.9% uptime для критического пути matching
- **Throughput**: поддержка 10k+ активных разработчиков, 1k+ задач/час
- **Real-time**: WebSocket присутствие с heartbeat 30s

## Технологический стек

### Core Technologies
- **Language**: Go 1.22+
- **Internal RPC**: gRPC + Protocol Buffers
- **Message Streaming**: NATS JetStream (low latency, simple ops)
- **Cache & Presence**: Redis Cluster 7.0+
- **Primary Storage**: PostgreSQL 15+ с PGVector extension
- **WebSocket**: Gorilla WebSocket / nhooyr.io/websocket
- **Orchestration**: Kubernetes + Helm

### Infrastructure
- **API Gateway**: Envoy/Traefik
- **Service Mesh**: Istio (optional, для advanced traffic management)
- **Monitoring**: Prometheus + Grafana + Jaeger
- **Secrets**: Kubernetes Secrets + External Secrets Operator

## Архитектура сервисов

### 1. API Gateway
- **Ответственность**: TLS termination, authentication, rate limiting, routing
- **Technology**: Envoy с JWT validation
- **Routing**: 
  - `/api/v1/users/*` → User Service
  - `/api/v1/clients/*` → Client Service  
  - `/api/v1/tasks/*` → Task Service
  - `/ws/presence` → Presence Service

### 2. User Service (Developers)
```go
type DeveloperProfile struct {
    UserID      string    `json:"user_id"`
    DisplayName string    `json:"display_name"`
    Email       string    `json:"email"`
    SkillTags   []string  `json:"skill_tags"`
    HourlyRate  float64   `json:"hourly_rate"`
    Rating      float64   `json:"rating"`
    Presence    PresenceStatus `json:"presence"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type PresenceStatus string
const (
    PresenceOffline   = "offline"
    PresenceIdle      = "idle" 
    PresenceSearching = "searching"
)
```

**Endpoints**:
- `POST /profiles` - создание профиля
- `PUT /profiles/{id}` - обновление анкеты  
- `PUT /profiles/{id}/presence` - смена статуса
- `GET /profiles/{id}` - получение профиля

**Events Published**:
- `user.profile.created`
- `user.profile.updated` 
- `user.presence.changed`

### 3. Task Service
```go
type Task struct {
    TaskID            string    `json:"task_id"`
    ClientID          string    `json:"client_id"`
    Title             string    `json:"title"`
    Description       string    `json:"description"`
    SkillTags         []string  `json:"skill_tags"`
    BudgetLowerBound  float64   `json:"budget_lower_bound"`
    BudgetUpperBound  float64   `json:"budget_upper_bound"`
    RepositoryURL     string    `json:"repository_url"`
    Priority          uint32    `json:"priority"`
    Status            TaskStatus `json:"status"`
    CreatedAt         time.Time `json:"created_at"`
}
```

**Events Published**:
- `task.created` - **критический event для запуска matching**
- `task.updated`
- `task.assigned`
- `task.cancelled`

### 4. Orchestrator (CORE сервис)

**Роль**: Центральный компонент для matching logic с минимальной задержкой.

#### Архитектура Orchestrator
```go
type Orchestrator struct {
    natsConn        *nats.Conn
    redisClient     *redis.ClusterClient  
    recClient       RecommendationServiceClient
    deliveryClient  DeliveryServiceClient
    taskSubscriber  *nats.Subscription
    logger          *zap.Logger
    metrics         *Metrics
}

// Критический метод - обрабатывает task.created
func (o *Orchestrator) handleTaskCreated(ctx context.Context, msg *TaskCreatedEvent) error {
    start := time.Now()
    defer o.metrics.matchingLatency.Observe(time.Since(start).Seconds())
    
    // Step 1: Fast candidate selection (Redis) - target 50ms
    candidates, err := o.getCandidates(ctx, msg)
    if err != nil {
        return err
    }
    
    // Step 2: Scoring via Recommendation Service - target 200ms  
    scores, err := o.recClient.ScoreCandidates(ctx, &ScoringRequest{
        TaskID: msg.TaskID,
        Candidates: candidates,
    })
    
    // Step 3: Create and deliver proposals - target 200ms
    return o.deliverProposals(ctx, msg.TaskID, scores.TopN(10))
}
```

#### Fast Candidate Selection Strategy

**Redis Data Structure для O(1) lookup:**
```bash
# Per-skill online developers (Sorted Set by rating)
skill:golang:online -> ZADD skill:golang:online 4.8 user_123
skill:python:online -> ZADD skill:python:online 4.5 user_456

# User presence with TTL
presence:user_123 -> {"status": "searching", "last_seen": "2024-10-19T10:30:00Z"} TTL 60s

# Price range indices (for budget filtering)  
budget:0-50:online -> SET user_123, user_456
budget:50-100:online -> SET user_789
```

**Candidate Selection Algorithm:**
```go
func (o *Orchestrator) getCandidates(ctx context.Context, task *TaskCreatedEvent) ([]string, error) {
    var candidates []string
    
    // Multi-skill intersection via Redis pipeline
    pipe := o.redisClient.Pipeline()
    
    // Get online developers for each required skill
    for _, skill := range task.SkillTags {
        pipe.ZRevRangeByScore(ctx, fmt.Sprintf("skill:%s:online", skill), &redis.ZRangeBy{
            Min: "3.0", // min rating threshold
            Max: "+inf",
        })
    }
    
    results, err := pipe.Exec(ctx)
    if err != nil {
        return nil, err
    }
    
    // Intersect results and filter by budget
    return o.intersectAndFilter(results, task.BudgetLowerBound, task.BudgetUpperBound), nil
}
```

### 5. Recommendation Engine
**Scoring Algorithm (гибридный подход):**

```go
func (r *RecommendationEngine) ScoreCandidates(ctx context.Context, req *ScoringRequest) (*ScoringResponse, error) {
    var scores []CandidateScore
    
    for _, candidate := range req.Candidates {
        score := r.calculateScore(ctx, req.TaskID, candidate)
        scores = append(scores, CandidateScore{
            UserID: candidate,
            Score:  score,
        })
    }
    
    // Sort by score desc
    sort.Slice(scores, func(i, j int) bool {
        return scores[i].Score > scores[j].Score  
    })
    
    return &ScoringResponse{Scores: scores}, nil
}

func (r *RecommendationEngine) calculateScore(ctx context.Context, taskID, userID string) float64 {
    // Weight distribution for scoring components
    const (
        skillMatchWeight    = 0.4  // 40% - skill intersection
        embeddingWeight     = 0.25 // 25% - semantic similarity  
        ratingWeight        = 0.15 // 15% - historical rating
        responsivenessWeight = 0.1  // 10% - response rate
        recencyWeight       = 0.1  // 10% - last active penalty
    )
    
    skillScore := r.calculateSkillMatch(taskID, userID)
    embeddingScore := r.calculateEmbeddingSimilarity(taskID, userID) 
    ratingScore := r.getUserRating(userID) / 5.0 // normalize to 0-1
    responsivenessScore := r.getUserResponseRate(userID)
    recencyScore := r.getRecencyScore(userID)
    
    totalScore := skillMatchWeight*skillScore + 
                  embeddingWeight*embeddingScore +
                  ratingWeight*ratingScore +
                  responsivenessWeight*responsivenessScore +
                  recencyWeight*recencyScore
                  
    return totalScore
}
```

### 6. Presence Service (WebSocket + Redis)

**WebSocket Handler:**
```go
func (ps *PresenceService) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := ps.upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    defer conn.Close()
    
    userID := r.Header.Get("X-User-ID") // from JWT
    
    // Register connection
    ps.registerConnection(userID, conn)
    defer ps.unregisterConnection(userID)
    
    // Heartbeat loop
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
            // Update presence in Redis
            ps.updatePresence(userID, "searching")
            
        case msg := <-ps.getDeliveryChannel(userID):
            if err := conn.WriteJSON(msg); err != nil {
                return
            }
        }
    }
}

func (ps *PresenceService) updatePresence(userID, status string) {
    // Update presence with TTL
    ps.redisClient.HSet(context.Background(), fmt.Sprintf("presence:%s", userID), map[string]interface{}{
        "status": status,
        "last_seen": time.Now().Unix(),
    })
    ps.redisClient.Expire(context.Background(), fmt.Sprintf("presence:%s", userID), 60*time.Second)
    
    // Update skill-based indices if status changed to searching
    if status == "searching" {
        user := ps.getUser(userID)
        for _, skill := range user.SkillTags {
            ps.redisClient.ZAdd(context.Background(), fmt.Sprintf("skill:%s:online", skill), 
                &redis.Z{Score: user.Rating, Member: userID})
        }
    } else {
        // Remove from all skill indices  
        user := ps.getUser(userID)
        for _, skill := range user.SkillTags {
            ps.redisClient.ZRem(context.Background(), fmt.Sprintf("skill:%s:online", skill), userID)
        }
    }
    
    // Publish presence change event
    ps.publishPresenceChange(userID, status)
}
```

### 7. Delivery Service

**Multi-channel delivery с fallback:**
```go
func (ds *DeliveryService) DeliverProposal(ctx context.Context, proposal *Proposal) error {
    start := time.Now()
    defer ds.metrics.deliveryLatency.Observe(time.Since(start).Seconds())
    
    // Try WebSocket first (fastest)
    if ds.presenceService.IsOnline(proposal.UserID) {
        if err := ds.deliverViaWebSocket(ctx, proposal); err == nil {
            ds.markDelivered(proposal.ID, "websocket")
            return nil
        }
    }
    
    // Fallback to push notification
    if err := ds.deliverViaPush(ctx, proposal); err == nil {
        ds.markDelivered(proposal.ID, "push")
        return nil
    }
    
    // Final fallback to email
    return ds.deliverViaEmail(ctx, proposal)
}

func (ds *DeliveryService) deliverViaWebSocket(ctx context.Context, proposal *Proposal) error {
    channel := ds.getDeliveryChannel(proposal.UserID)
    
    message := DeliveryMessage{
        Type: "task_proposal",
        TaskID: proposal.TaskID,
        Title: proposal.TaskTitle,
        Budget: proposal.Budget,
        ExpiresAt: time.Now().Add(5 * time.Minute),
    }
    
    select {
    case channel <- message:
        return nil
    case <-time.After(100 * time.Millisecond): // timeout for WebSocket delivery
        return errors.New("websocket delivery timeout")
    }
}
```

## Event Streaming (NATS JetStream)

### Stream Configuration
```bash
# Task lifecycle stream
nats stream add TASKS --subjects="task.*" --retention=limits --max-age=24h

# User events stream  
nats stream add USERS --subjects="user.*" --retention=limits --max-age=24h

# Matching events stream
nats stream add MATCHING --subjects="match.*" --retention=limits --max-age=7d
```

### Event Schemas
```go
// Critical event - triggers matching flow
type TaskCreatedEvent struct {
    TaskID            string    `json:"task_id"`
    ClientID          string    `json:"client_id"`
    Title             string    `json:"title"`
    Description       string    `json:"description"`
    SkillTags         []string  `json:"skill_tags"`
    BudgetLowerBound  float64   `json:"budget_lower_bound"`
    BudgetUpperBound  float64   `json:"budget_upper_bound"`
    Priority          uint32    `json:"priority"`
    CreatedAt         time.Time `json:"created_at"`
}

type UserPresenceChangedEvent struct {
    UserID    string    `json:"user_id"`
    Status    string    `json:"status"`
    Timestamp time.Time `json:"timestamp"`
}

type MatchProposedEvent struct {
    ProposalID string    `json:"proposal_id"`
    TaskID     string    `json:"task_id"`
    UserID     string    `json:"user_id"`
    Score      float64   `json:"score"`
    ExpiresAt  time.Time `json:"expires_at"`
}
```

## База данных (PostgreSQL + Redis)

### PostgreSQL Schema
```sql
-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    skill_tags TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0.0,
    response_rate DECIMAL(3,2) DEFAULT 0.0,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast skill lookups
CREATE INDEX idx_users_skill_tags ON users USING GIN(skill_tags);
CREATE INDEX idx_users_rating ON users(rating DESC);

-- Tasks table
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    skill_tags TEXT[] DEFAULT '{}',
    budget_lower_bound DECIMAL(10,2),
    budget_upper_bound DECIMAL(10,2),
    repository_url VARCHAR(1000),
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_skill_tags ON tasks USING GIN(skill_tags);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC);

-- Proposals table  
CREATE TABLE proposals (
    proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    score DECIMAL(5,4),
    status VARCHAR(50) DEFAULT 'proposed',
    delivered_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX idx_proposals_task_user ON proposals(task_id, user_id);
CREATE INDEX idx_proposals_user_status ON proposals(user_id, status);

-- PGVector extension for embeddings (optional advanced feature)
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE users ADD COLUMN embedding vector(384); -- BERT embeddings
ALTER TABLE tasks ADD COLUMN embedding vector(384);

CREATE INDEX idx_users_embedding ON users USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_tasks_embedding ON tasks USING ivfflat (embedding vector_cosine_ops);
```

### Redis Data Model
```bash
# Online developers by skill (Sorted Set by rating)
ZADD skill:golang:online 4.8 user_123
ZADD skill:python:online 4.5 user_456

# User presence (Hash with TTL) 
HSET presence:user_123 status searching last_seen 1697712600
EXPIRE presence:user_123 60

# Budget-based indices (Set)
SADD budget:0-50:online user_123 user_456
SADD budget:50-100:online user_789

# Delivery channels (List)
LPUSH delivery:user_123 '{"type":"task_proposal","task_id":"task_456"}'

# Proposal deduplication (Set with TTL)
SETEX proposal:task_456:user_123 300 "proposed"

# Rate limiting (String with TTL)
SETEX rate_limit:user_123:proposals 3600 5  # max 5 proposals per hour
```

## Критический путь производительности

### Latency Budget Breakdown (target 500ms P95):
1. **NATS message delivery**: ~5-10ms
2. **Redis candidate lookup**: ~20-50ms  
3. **Recommendation scoring**: ~100-200ms
4. **Proposal creation & persistence**: ~50ms
5. **WebSocket delivery**: ~20-50ms
6. **Buffer for retries/overhead**: ~100ms

### Optimization Techniques:

#### 1. Hot Path Optimization
```go
// Precompute skill intersections
func (o *Orchestrator) precomputeSkillIntersections() {
    // Background goroutine maintains skill combination caches
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        for range ticker.C {
            o.updateSkillCombinationCache()
        }
    }()
}

// Connection pooling for Redis
func NewRedisClient() *redis.ClusterClient {
    return redis.NewClusterClient(&redis.ClusterOptions{
        Addrs:        []string{"redis-0:6379", "redis-1:6379", "redis-2:6379"},
        PoolSize:     100, // High connection pool
        MinIdleConns: 10,
        MaxRetries:   2,
        DialTimeout:  100 * time.Millisecond,
        ReadTimeout:  200 * time.Millisecond,
        WriteTimeout: 200 * time.Millisecond,
    })
}
```

#### 2. Async Processing где возможно
```go
func (o *Orchestrator) deliverProposals(ctx context.Context, taskID string, candidates []CandidateScore) error {
    // Async proposal creation
    var wg sync.WaitGroup
    errCh := make(chan error, len(candidates))
    
    for _, candidate := range candidates {
        wg.Add(1)
        go func(c CandidateScore) {
            defer wg.Done()
            if err := o.deliverSingleProposal(ctx, taskID, c); err != nil {
                errCh <- err
            }
        }(candidate)
    }
    
    wg.Wait()
    close(errCh)
    
    // Log errors but don't fail entire operation
    for err := range errCh {
        o.logger.Error("proposal delivery failed", zap.Error(err))
    }
    
    return nil
}
```

#### 3. Circuit Breaker Pattern
```go
type CircuitBreaker struct {
    failures    int32
    threshold   int32
    timeout     time.Duration
    lastFailure time.Time
    mutex       sync.RWMutex
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mutex.RLock()
    failures := atomic.LoadInt32(&cb.failures)
    cb.mutex.RUnlock()
    
    if failures >= cb.threshold && time.Since(cb.lastFailure) < cb.timeout {
        return errors.New("circuit breaker open")
    }
    
    err := fn()
    if err != nil {
        atomic.AddInt32(&cb.failures, 1)
        cb.lastFailure = time.Now()
    } else {
        atomic.StoreInt32(&cb.failures, 0)
    }
    
    return err
}
```

## Мониторинг и Observability

### Key Metrics (Prometheus)
```go
var (
    // Latency metrics
    matchingLatency = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "matching_latency_seconds",
            Help:    "Time from task.created to proposal.delivered",
            Buckets: []float64{0.1, 0.2, 0.5, 1.0, 2.0, 5.0},
        },
        []string{"status"},
    )
    
    // Throughput metrics  
    proposalsDelivered = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "proposals_delivered_total",
            Help: "Total number of proposals delivered",
        },
        []string{"channel", "status"},
    )
    
    // Business metrics
    proposalAcceptanceRate = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "proposal_acceptance_rate",
            Help: "Rate of proposal acceptance",
        },
        []string{"time_window"},
    )
    
    // System health
    onlineDevelopersCount = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "online_developers_count",
            Help: "Number of developers currently online and searching",
        },
        []string{"skill"},
    )
)
```

### Alerting Rules
```yaml
groups:
  - name: freelance_platform
    rules:
      - alert: HighMatchingLatency
        expr: histogram_quantile(0.95, matching_latency_seconds) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Matching latency is above target"
          
      - alert: LowProposalDeliveryRate  
        expr: rate(proposals_delivered_total{status="failed"}[5m]) / rate(proposals_delivered_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High proposal delivery failure rate"
          
      - alert: NATSConnectionDown
        expr: up{job="nats"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "NATS connection is down"
```

## Deployment Architecture

### Kubernetes Manifests

#### Orchestrator Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orchestrator
  template:
    metadata:
      labels:
        app: orchestrator
    spec:
      containers:
      - name: orchestrator
        image: freelance-platform/orchestrator:latest
        ports:
        - containerPort: 8080
        env:
        - name: NATS_URL
          value: "nats://nats-cluster:4222"
        - name: REDIS_CLUSTER_ADDRS
          value: "redis-0:6379,redis-1:6379,redis-2:6379"
        - name: POSTGRES_DSN
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: dsn
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi" 
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: orchestrator-service
spec:
  selector:
    app: orchestrator
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### Helm Chart Structure
```
charts/
├── freelance-platform/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── templates/
│   │   ├── orchestrator/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── configmap.yaml
│   │   ├── user-service/
│   │   ├── task-service/
│   │   ├── presence-service/
│   │   ├── recommendation-service/
│   │   └── delivery-service/
│   └── charts/
│       ├── redis/
│       ├── nats/
│       └── postgresql/
```

## Безопасность

### Authentication & Authorization
```go
// JWT middleware for gRPC
func JWTInterceptor(secret []byte) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        token, err := extractTokenFromContext(ctx)
        if err != nil {
            return nil, status.Errorf(codes.Unauthenticated, "missing token")
        }
        
        claims, err := validateJWT(token, secret)
        if err != nil {
            return nil, status.Errorf(codes.Unauthenticated, "invalid token")
        }
        
        // Add user info to context
        ctx = context.WithValue(ctx, "user_id", claims.UserID)
        ctx = context.WithValue(ctx, "role", claims.Role)
        
        return handler(ctx, req)
    }
}

// RBAC check
func RequireRole(role string) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        userRole := ctx.Value("role").(string)
        if userRole != role && userRole != "admin" {
            return nil, status.Errorf(codes.PermissionDenied, "insufficient permissions")
        }
        return handler(ctx, req)
    }
}
```

### Rate Limiting
```go
func (ds *DeliveryService) checkRateLimit(userID string) error {
    key := fmt.Sprintf("rate_limit:%s:proposals", userID)
    current, err := ds.redisClient.Get(context.Background(), key).Int()
    if err != nil && err != redis.Nil {
        return err
    }
    
    const maxProposalsPerHour = 50
    if current >= maxProposalsPerHour {
        return errors.New("rate limit exceeded")
    }
    
    // Increment counter
    pipe := ds.redisClient.Pipeline()
    pipe.Incr(context.Background(), key)
    pipe.Expire(context.Background(), key, time.Hour)
    _, err = pipe.Exec(context.Background())
    
    return err
}
```

## Scaling Strategy

### Horizontal Scaling
- **Stateless services**: User, Task, Recommendation services - HPA based on CPU/memory
- **Orchestrator**: Multiple instances with NATS consumer groups
- **Redis**: Cluster mode с 3+ master nodes
- **PostgreSQL**: Read replicas для analytics queries

### Vertical Scaling
- **NATS**: Optimize для high throughput (increase max_payload, max_connections)
- **Redis**: Memory optimization, use Redis modules (RedisBloom для deduplication)

### Data Partitioning
```go
// Shard users by region для locality
func (s *UserService) getShardKey(userID string) string {
    hash := sha256.Sum256([]byte(userID))
    return fmt.Sprintf("shard_%d", binary.BigEndian.Uint32(hash[:4])%8)
}

// Redis cluster with skill-based sharding
func (ps *PresenceService) getSkillShardKey(skill string) string {
    return fmt.Sprintf("skill:{%s}:online", skill) // Redis Cluster hash tag
}
```

## Testing Strategy

### Load Testing (k6)
```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 1000 }, // Ramp up to 1000 WS connections
    { duration: '5m', target: 1000 }, // Stay at 1000 connections
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

export default function () {
  const url = 'ws://localhost:8080/ws/presence';
  const response = ws.connect(url, function (socket) {
    socket.on('open', function() {
      // Simulate developer going online
      socket.send(JSON.stringify({
        action: 'set_presence',
        status: 'searching'
      }));
    });
    
    socket.on('message', function(data) {
      const message = JSON.parse(data);
      if (message.type === 'task_proposal') {
        // Simulate developer response (accept/reject)
        socket.send(JSON.stringify({
          action: 'proposal_response',
          proposal_id: message.proposal_id,
          status: Math.random() > 0.7 ? 'accepted' : 'rejected'
        }));
      }
    });
  });
  
  check(response, { 'status is 101': (r) => r && r.status === 101 });
}
```

### Integration Tests
```go
func TestEndToEndMatching(t *testing.T) {
    // Setup test environment
    testDB := setupTestDB(t)
    testRedis := setupTestRedis(t)
    testNATS := setupTestNATS(t)
    
    // Create test developer
    developer := createTestDeveloper(testDB, []string{"golang", "kubernetes"})
    
    // Set developer as online and searching
    setDeveloperPresence(testRedis, developer.UserID, "searching")
    
    // Create task with matching skills
    task := createTestTask(testDB, []string{"golang"}, 50.0, 100.0)
    
    // Publish task.created event
    publishTaskCreated(testNATS, task)
    
    // Wait for proposal delivery (with timeout)
    proposal := waitForProposal(t, testDB, task.TaskID, developer.UserID, 2*time.Second)
    
    assert.NotNil(t, proposal)
    assert.Equal(t, "proposed", proposal.Status)
    assert.WithinDuration(t, time.Now(), proposal.CreatedAt, 500*time.Millisecond)
}
```

## Migration Plan (MVP → Production)

### Phase 1: MVP (2-3 weeks)
1. ✅ Basic protobuf contracts
2. ✅ PostgreSQL schema + migrations  
3. ✅ User Service (CRUD, basic presence)
4. ✅ Task Service (CRUD, event publishing)
5. ✅ Simple Orchestrator (Redis lookup + basic scoring)
6. ✅ WebSocket presence service
7. ✅ Basic delivery via WebSocket
8. ✅ End-to-end integration test

**Success Criteria**: 
- Task creation → proposal delivery < 2 seconds  
- Support 100 concurrent developers
- Basic monitoring dashboard

### Phase 2: Performance Optimization (1-2 weeks)
1. ✅ Advanced Redis data structures (skill indices)
2. ✅ Connection pooling optimization
3. ✅ Async proposal delivery
4. ✅ Circuit breakers + retries
5. ✅ Comprehensive metrics + alerting
6. ✅ Load testing suite

**Success Criteria**:
- P95 latency < 500ms
- Support 1000+ concurrent developers  
- 99.9% delivery success rate

### Phase 3: Advanced Features (2-3 weeks) 
1. ✅ ML-based scoring (embeddings)
2. ✅ Multi-channel delivery (push, email)
3. ✅ Advanced matching strategies
4. ✅ A/B testing framework
5. ✅ Analytics dashboard
6. ✅ Auto-scaling setup

### Phase 4: Production Readiness (1-2 weeks)
1. ✅ Security audit + penetration testing
2. ✅ Disaster recovery procedures  
3. ✅ Performance tuning for production load
4. ✅ Documentation + runbooks
5. ✅ Staff training

## Заключение

Данная архитектура обеспечивает:

- **Ultra-low latency**: P95 < 500ms для критического пути
- **High scalability**: горизонтальное масштабирование всех компонентов  
- **Fault tolerance**: circuit breakers, retries, graceful degradation
- **Observability**: comprehensive metrics, tracing, alerting
- **Developer experience**: четкие контракты, документация, тесты

Ключевые технические решения:
1. **Event-driven architecture** с NATS JetStream для минимальной задержки
2. **Smart caching** в Redis для O(1) candidate lookup
3. **Async processing** где возможно для максимального throughput
4. **WebSocket-first** delivery для real-time уведомлений
5. **Comprehensive monitoring** для проактивного management

Архитектура готова к реализации следующим агентом с четким планом поэтапного развертывания от MVP до production-ready системы.