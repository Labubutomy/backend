# Production Deployment Guide

## Overview

This guide covers deployment of the Freelance Platform microservices to production environments. The platform consists of three core services:

- **User Service** (50051): User management, authentication, developer profiles
- **Task Service** (50052): Task CRUD operations, NATS event publishing  
- **Orchestrator** (50053): Task-developer matching engine with ML scoring

## Prerequisites

### Infrastructure Requirements

- **Docker**: Version 24+ with Docker Compose
- **Go**: Version 1.24.5+ (for compilation)
- **PostgreSQL**: Version 15+ with PGVector extension
- **NATS**: Version 2.10+ for event streaming
- **Redis**: Version 7+ for caching and sessions

### System Requirements

- **CPU**: 4+ cores recommended
- **Memory**: 8GB+ RAM minimum 
- **Storage**: 50GB+ SSD storage
- **Network**: Stable internet for external dependencies

## Environment Setup

### 1. Infrastructure Deployment

#### Option A: Docker Compose (Recommended for staging)

```bash
# Clone repository
git clone https://github.com/Labubutomy/backend.git
cd backend

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure
make docker-up
```

#### Option B: Kubernetes (Production)

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgresql.yaml
kubectl apply -f k8s/nats.yaml
kubectl apply -f k8s/redis.yaml
```

### 2. Database Setup

```bash
# Apply migrations
make migrate-up

# Verify database schema
psql -h localhost -U postgres -d freelance_platform -c "\dt"
```

Expected tables:
- `users` - User profiles and authentication
- `tasks` - Task definitions and metadata  
- `proposals` - Task-developer matching proposals

### 3. Service Configuration

#### Environment Variables

Create `.env` file with the following variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freelance_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL_MODE=disable

# NATS
NATS_URL=nats://localhost:4222

# Redis  
REDIS_URL=redis://localhost:6379

# Service Ports
USER_SERVICE_PORT=50051
TASK_SERVICE_PORT=50052
ORCHESTRATOR_PORT=50053

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
JWT_SECRET=your_jwt_secret_key
API_KEY=your_api_key

# Monitoring
METRICS_PORT=8080
HEALTH_CHECK_PORT=8081
```

#### Production Environment Variables

For production, set additional security-focused variables:

```bash
# Production Database with SSL
DB_SSL_MODE=require
DB_SSL_CERT=/path/to/client-cert.pem
DB_SSL_KEY=/path/to/client-key.pem
DB_SSL_ROOT_CERT=/path/to/ca-cert.pem

# Production NATS with TLS
NATS_TLS_CERT=/path/to/nats-client.crt
NATS_TLS_KEY=/path/to/nats-client.key
NATS_TLS_CA=/path/to/nats-ca.crt

# Monitoring & Observability
JAEGER_ENDPOINT=https://jaeger.your-domain.com
PROMETHEUS_ENDPOINT=https://prometheus.your-domain.com
```

## Service Deployment

### 1. Build Services

```bash
# Development build
make build

# Production build (optimized)
make prod-build
```

### 2. Container Deployment

#### Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  userservice:
    image: freelance-platform/userservice:latest
    ports:
      - "50051:50051"
    environment:
      - DB_HOST=postgres
      - NATS_URL=nats://nats:4222
    depends_on:
      - postgres
      - nats
    restart: unless-stopped
    
  taskservice:
    image: freelance-platform/taskservice:latest
    ports:
      - "50052:50052"
    environment:
      - DB_HOST=postgres
      - NATS_URL=nats://nats:4222
    depends_on:
      - postgres
      - nats
    restart: unless-stopped
    
  orchestrator:
    image: freelance-platform/orchestrator:latest
    ports:
      - "50053:50053"
    environment:
      - DB_HOST=postgres
      - NATS_URL=nats://nats:4222
    depends_on:
      - postgres
      - nats
      - userservice
    restart: unless-stopped
```

#### Kubernetes Deployment

```yaml
# k8s/userservice-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: userservice
  namespace: freelance-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: userservice
  template:
    metadata:
      labels:
        app: userservice
    spec:
      containers:
      - name: userservice
        image: freelance-platform/userservice:v1.0.0
        ports:
        - containerPort: 50051
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          grpc:
            port: 50051
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          grpc:
            port: 50051
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Health Checks and Monitoring

### 1. Health Check Endpoints

Each service exposes health check endpoints:

```bash
# User Service
curl http://localhost:50051/health

# Task Service  
curl http://localhost:50052/health

# Orchestrator
curl http://localhost:50053/health
```

### 2. Metrics Collection

Services expose Prometheus metrics on `:8080/metrics`:

```bash
# View metrics
curl http://localhost:8080/metrics
```

Key metrics to monitor:
- `grpc_requests_total` - Total gRPC requests
- `grpc_request_duration_seconds` - Request latency
- `nats_messages_published_total` - NATS message throughput
- `db_connections_active` - Database connection pool usage

### 3. Grafana Dashboards

Import provided dashboards from `monitoring/dashboards/`:
- Service Performance Dashboard
- Infrastructure Metrics Dashboard  
- Business Metrics Dashboard

## Security Configuration

### 1. TLS/SSL Setup

#### gRPC Services with TLS

```go
// Enable TLS for gRPC servers
creds, err := credentials.NewServerTLSFromFile(certFile, keyFile)
if err != nil {
    log.Fatal("Failed to setup TLS:", err)
}
s := grpc.NewServer(grpc.Creds(creds))
```

#### NATS with TLS

```bash
# NATS server config with TLS
tls {
  cert_file: "/etc/nats/certs/server.crt"
  key_file: "/etc/nats/certs/server.key"
  ca_file: "/etc/nats/certs/ca.crt"
}
```

### 2. Network Security

#### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 50051/tcp  # User Service
ufw allow 50052/tcp  # Task Service  
ufw allow 50053/tcp  # Orchestrator
ufw allow 22/tcp     # SSH
ufw deny 5432/tcp    # Block external DB access
ufw deny 4222/tcp    # Block external NATS access
```

#### Service Mesh (Istio)

```yaml
# istio-config.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: freelance-platform
spec:
  mtls:
    mode: STRICT
```

## Database Management

### 1. Backup Strategy

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres freelance_platform > backup_${DATE}.sql

# Backup to S3
aws s3 cp backup_${DATE}.sql s3://your-backup-bucket/db-backups/
```

### 2. Migration Management

```bash
# Check migration status
make migrate-status

# Apply pending migrations
make migrate-up

# Rollback if needed
make migrate-down
```

## Scaling and Performance

### 1. Horizontal Scaling

#### Load Balancer Configuration (nginx)

```nginx
upstream userservice {
    server userservice-1:50051;
    server userservice-2:50051;
    server userservice-3:50051;
}

upstream taskservice {
    server taskservice-1:50052;
    server taskservice-2:50052;
}

upstream orchestrator {
    server orchestrator-1:50053;
    server orchestrator-2:50053;
}
```

#### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: userservice-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: userservice
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 2. Performance Optimization

#### Database Connection Pooling

```go
// Configure PostgreSQL connection pool
config.MaxOpenConns = 25
config.MaxIdleConns = 10
config.ConnMaxLifetime = time.Hour
```

#### NATS Clustering

```bash
# NATS cluster configuration
cluster {
  name: "freelance-platform"
  routes: [
    nats://nats-1:6222
    nats://nats-2:6222
    nats://nats-3:6222
  ]
}
```

## Troubleshooting

### 1. Common Issues

#### Service Discovery Problems

```bash
# Check service connectivity
docker exec -it userservice ping taskservice
docker exec -it orchestrator nc -zv userservice 50051
```

#### Database Connection Issues

```bash
# Test database connectivity
psql -h postgres -U postgres -d freelance_platform -c "SELECT 1;"

# Check connection pool metrics
curl http://localhost:8080/metrics | grep db_connections
```

#### NATS Connectivity Issues

```bash
# Check NATS server status
curl http://nats:8222/varz

# Test message publishing
nats pub test.subject "test message"
nats sub test.subject
```

### 2. Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
export LOG_FORMAT=text  # Human-readable format
```

### 3. Performance Issues

#### Identify Bottlenecks

```bash
# Check service metrics
curl http://localhost:8080/metrics | grep grpc_request_duration

# Database query analysis
EXPLAIN ANALYZE SELECT * FROM users WHERE skill_tags @> '["golang"]';

# Check NATS throughput
nats server info
```

## Rollback Procedures

### 1. Service Rollback

```bash
# Docker Compose rollback
docker-compose down
docker-compose up -d --scale userservice=0
docker tag freelance-platform/userservice:v1.0.0 freelance-platform/userservice:latest
docker-compose up -d

# Kubernetes rollback
kubectl rollout undo deployment/userservice -n freelance-platform
kubectl rollout status deployment/userservice -n freelance-platform
```

### 2. Database Rollback

```bash
# Rollback migrations
make migrate-down

# Restore from backup
psql -h localhost -U postgres -d freelance_platform < backup_20241019_120000.sql
```

## Maintenance

### 1. Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

# Database maintenance
psql -c "VACUUM ANALYZE;"
psql -c "REINDEX DATABASE freelance_platform;"

# Log rotation
logrotate /etc/logrotate.d/freelance-platform

# Certificate renewal (if using Let's Encrypt)
certbot renew --quiet
```

### 2. Monitoring and Alerts

#### Alertmanager Rules

```yaml
# alerts.yml
groups:
- name: freelance-platform
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.instance }} is down"
      
  - alert: HighLatency
    expr: grpc_request_duration_seconds > 1
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected on {{ $labels.service }}"
```

### 3. Capacity Planning

Monitor these metrics for capacity planning:
- CPU and memory usage trends
- Database storage growth
- Network throughput
- Request volume patterns

## Security Checklist

- [ ] TLS enabled for all gRPC communications
- [ ] Database connections use SSL
- [ ] NATS cluster secured with TLS
- [ ] Firewall rules configured  
- [ ] Service mesh mTLS enabled (if using Istio)
- [ ] Secrets managed through Kubernetes secrets or Vault
- [ ] Regular security updates applied
- [ ] Database access restricted to services only
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

## Support

For production issues:
- Check service logs: `kubectl logs -f deployment/servicename`
- Monitor health checks: `curl http://service:port/health`
- Review metrics: Grafana dashboards at `http://grafana.your-domain.com`
- Emergency contacts: [Your team contact information]

---

**Next Steps**: After deployment, see [OPERATIONS.md](./OPERATIONS.md) for day-to-day operations and [DEVELOPMENT.md](./DEVELOPMENT.md) for development workflows.