# Operations Manual

## Overview

This manual covers day-to-day operations, monitoring, troubleshooting, and maintenance of the Freelance Platform in production environments.

## Service Monitoring

### Health Checks

#### Automated Health Checks

Each service exposes health endpoints that should be monitored:

```bash
# User Service Health Check
curl -f http://localhost:50051/health || alert "User Service Down"

# Task Service Health Check  
curl -f http://localhost:50052/health || alert "Task Service Down"

# Orchestrator Health Check
curl -f http://localhost:50053/health || alert "Orchestrator Down"
```

#### Health Check Response Format

```json
{
  "status": "healthy",
  "version": "v1.0.0",
  "timestamp": "2024-10-19T15:30:00Z",
  "checks": {
    "database": "healthy",
    "nats": "healthy", 
    "redis": "healthy"
  },
  "uptime": "72h30m15s"
}
```

#### Service Dependencies

```yaml
User Service Dependencies:
  - PostgreSQL (critical)
  - Redis (non-critical, for caching)
  
Task Service Dependencies:
  - PostgreSQL (critical)
  - NATS (critical, for events)
  
Orchestrator Dependencies:
  - PostgreSQL (critical)
  - NATS (critical, for events)
  - User Service (critical, for developer lookup)
```

### Key Metrics to Monitor

#### Service Metrics

```prometheus
# Request Rate
rate(grpc_server_handled_total[5m])

# Request Latency (95th percentile)
histogram_quantile(0.95, grpc_server_handling_seconds_bucket)

# Error Rate
rate(grpc_server_handled_total{grpc_code!="OK"}[5m]) / rate(grpc_server_handled_total[5m])

# Active Connections
grpc_server_active_connections

# Memory Usage
go_memstats_alloc_bytes

# Goroutine Count
go_goroutines
```

#### Business Metrics

```prometheus
# Tasks Created
rate(tasks_created_total[5m])

# Matching Success Rate  
rate(matches_successful_total[5m]) / rate(matches_attempted_total[5m])

# Active Users
users_online_count

# Proposal Response Time
histogram_quantile(0.95, proposal_response_time_seconds_bucket)
```

#### Infrastructure Metrics

```prometheus
# Database Connections
pg_connections_active / pg_connections_max

# NATS Message Rate
rate(nats_messages_published_total[5m])

# Redis Memory Usage  
redis_memory_used_bytes / redis_memory_max_bytes

# Container Resources
container_cpu_usage_percent
container_memory_usage_percent
```

### Alert Thresholds

#### Critical Alerts (Immediate Response Required)

```yaml
Service Down:
  condition: up == 0
  duration: 30s
  severity: critical
  
High Error Rate:
  condition: error_rate > 0.05  # 5%
  duration: 2m
  severity: critical
  
Database Connection Pool Exhausted:
  condition: pg_connections_active / pg_connections_max > 0.9
  duration: 1m
  severity: critical

High Memory Usage:
  condition: container_memory_usage_percent > 90
  duration: 5m
  severity: critical
```

#### Warning Alerts (Monitor Closely)

```yaml
Elevated Latency:
  condition: p95_latency > 1s
  duration: 5m
  severity: warning
  
Low Matching Success Rate:
  condition: matching_success_rate < 0.8
  duration: 10m
  severity: warning
  
High CPU Usage:
  condition: container_cpu_usage_percent > 80
  duration: 10m
  severity: warning
```

## Troubleshooting Guide

### Common Issues

#### 1. Service Unavailable

**Symptoms:**
- Health checks failing
- gRPC connection errors
- Timeouts

**Investigation Steps:**

```bash
# Check service status
kubectl get pods -n freelance-platform
docker-compose ps

# Check service logs
kubectl logs -f deployment/userservice -n freelance-platform
docker-compose logs userservice --tail 100

# Check resource usage
kubectl top pods -n freelance-platform
docker stats

# Test connectivity
grpcurl -plaintext localhost:50051 list
nc -zv userservice 50051
```

**Common Causes & Solutions:**

```bash
# Out of Memory
kubectl describe pod userservice-xxx
# Solution: Increase memory limits or investigate memory leaks

# Port conflicts  
lsof -i :50051
# Solution: Kill conflicting process or change port

# Database connection issues
psql -h postgres -U postgres -d freelance_platform -c "SELECT 1;"
# Solution: Check database credentials, connectivity

# Resource limits
kubectl describe node
# Solution: Scale cluster or optimize resource usage
```

#### 2. High Latency

**Symptoms:**
- Slow API responses
- Request timeouts
- User complaints

**Investigation Steps:**

```bash
# Check current latency metrics
curl http://localhost:8080/metrics | grep grpc_server_handling_seconds

# Identify slow queries
psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check database locks
psql -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Monitor gRPC streams
grpcurl -plaintext localhost:50051 platform.users.v1.UserService/ListOnlineDevelopers
```

**Common Solutions:**

```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_skill_tags_gin ON users USING gin(skill_tags);
CREATE INDEX CONCURRENTLY idx_tasks_status_created ON tasks(status, created_at);

-- Optimize queries
EXPLAIN ANALYZE SELECT * FROM users WHERE skill_tags @> '["golang"]';
```

```go
// Optimize connection pooling
config.MaxOpenConns = 25
config.MaxIdleConns = 10
config.ConnMaxLifetime = time.Hour
```

#### 3. Database Issues

**Symptoms:**
- Connection pool exhausted
- Slow queries
- Lock timeouts

**Investigation:**

```sql
-- Check active connections
SELECT datname, usename, application_name, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

**Solutions:**

```bash
# Terminate long-running queries
psql -c "SELECT pg_terminate_backend(12345);"  # Replace with actual PID

# Increase connection limits temporarily
psql -c "ALTER SYSTEM SET max_connections = 200;"
psql -c "SELECT pg_reload_conf();"

# Vacuum and analyze tables
psql -c "VACUUM ANALYZE;"

# Reindex if needed
psql -c "REINDEX DATABASE freelance_platform;"
```

#### 4. NATS Connectivity Issues

**Symptoms:**
- Events not being processed
- Message queue buildup
- Orchestrator not receiving task.created events

**Investigation:**

```bash
# Check NATS server status
curl http://nats:8222/varz

# List active subscriptions
curl http://nats:8222/subsz

# Check message rates
curl http://nats:8222/statsz

# Test message flow
nats pub task.created '{"task_id":"test-123","title":"Test"}'
nats sub ">"  # Monitor all subjects
```

**Solutions:**

```bash
# Restart NATS server
docker-compose restart nats
kubectl rollout restart deployment/nats -n freelance-platform

# Check NATS cluster health (if clustered)
curl http://nats-1:8222/routez
curl http://nats-2:8222/routez

# Purge messages if queue is backed up
nats stream purge TASKS --force
```

#### 5. Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Container restarts

**Investigation:**

```bash
# Get memory profile
go tool pprof http://localhost:50051/debug/pprof/heap

# Check goroutine leaks
go tool pprof http://localhost:50051/debug/pprof/goroutine

# Monitor garbage collection
curl http://localhost:8080/metrics | grep go_gc
```

**Analysis Commands:**

```go
// In pprof shell
(pprof) top10
(pprof) list main.handleRequest
(pprof) web  // Generate web visualization
```

### Performance Optimization

#### Database Optimization

```sql
-- Monitor query performance
SELECT query, calls, total_time, mean_time, stddev_time, rows, 
       100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Analyze table statistics
SELECT schemaname, tablename, n_live_tup, n_dead_tup, 
       round((n_dead_tup::float / (n_live_tup + n_dead_tup)) * 100, 2) as dead_tuple_percent
FROM pg_stat_user_tables
WHERE n_live_tup > 0;
```

#### Connection Pool Tuning

```go
// Optimal connection pool settings
dbConfig := &pgxpool.Config{
    MaxConns:        25,                    // Adjust based on load
    MinConns:        5,                     // Keep connections warm
    MaxConnLifetime: time.Hour,             // Rotate connections
    MaxConnIdleTime: time.Minute * 30,      // Close idle connections
    HealthCheckPeriod: time.Minute * 5,     // Check connection health
}
```

#### gRPC Performance Tuning

```go
// Server-side optimizations
serverOptions := []grpc.ServerOption{
    grpc.KeepaliveParams(keepalive.ServerParameters{
        MaxConnectionIdle: 15 * time.Second,
        MaxConnectionAge:  30 * time.Second,
        MaxConnectionAgeGrace: 5 * time.Second,
        Time: 5 * time.Second,
        Timeout: 1 * time.Second,
    }),
    grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
        MinTime: 5 * time.Second,
        PermitWithoutStream: true,
    }),
    grpc.MaxRecvMsgSize(4 * 1024 * 1024),  // 4MB
    grpc.MaxSendMsgSize(4 * 1024 * 1024),  // 4MB
}
```

## Operational Procedures

### Deployment Procedures

#### Rolling Deployment

```bash
# Kubernetes rolling update
kubectl set image deployment/userservice userservice=freelance-platform/userservice:v1.1.0 -n freelance-platform
kubectl rollout status deployment/userservice -n freelance-platform

# Verify health after deployment
kubectl get pods -n freelance-platform
curl http://userservice:50051/health
```

#### Blue-Green Deployment

```bash
# Deploy to green environment
kubectl apply -f k8s/userservice-green.yaml

# Test green environment
curl http://userservice-green:50051/health

# Switch traffic to green
kubectl patch service userservice -p '{"spec":{"selector":{"version":"green"}}}'

# Cleanup blue environment after verification
kubectl delete deployment userservice-blue
```

#### Rollback Procedure

```bash
# Quick rollback
kubectl rollout undo deployment/userservice -n freelance-platform

# Rollback to specific version
kubectl rollout undo deployment/userservice --to-revision=2 -n freelance-platform

# Verify rollback
kubectl rollout status deployment/userservice -n freelance-platform
curl http://userservice:50051/health
```

### Database Maintenance

#### Regular Maintenance Tasks

```bash
#!/bin/bash
# daily-maintenance.sh

echo "Starting daily database maintenance..."

# Update table statistics
psql -c "ANALYZE;"

# Vacuum tables (non-blocking)
psql -c "VACUUM (ANALYZE, VERBOSE);"

# Check for bloated tables
psql -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       round((n_dead_tup::float / (n_live_tup + n_dead_tup)) * 100, 2) as bloat_percent
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY bloat_percent DESC;"

# Reindex if needed (run during low traffic)
if [ "$(date +%H)" -eq 3 ]; then
    psql -c "REINDEX INDEX CONCURRENTLY idx_users_skill_tags_gin;"
fi

echo "Database maintenance completed."
```

#### Backup Procedures

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="freelance_platform_${DATE}.sql"
S3_BUCKET="your-backup-bucket"

echo "Starting database backup..."

# Create backup
pg_dump -h postgres -U postgres -d freelance_platform \
    --verbose --no-password --format=custom \
    --file="/tmp/${BACKUP_FILE}"

# Compress backup
gzip "/tmp/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "/tmp/${BACKUP_FILE}.gz" "s3://${S3_BUCKET}/db-backups/"

# Cleanup local file
rm "/tmp/${BACKUP_FILE}.gz"

# Keep last 7 days of backups
aws s3 ls "s3://${S3_BUCKET}/db-backups/" | \
    head -n -7 | \
    awk '{print $4}' | \
    xargs -I {} aws s3 rm "s3://${S3_BUCKET}/db-backups/{}"

echo "Database backup completed: ${BACKUP_FILE}.gz"
```

#### Recovery Procedures

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Starting database restore from ${BACKUP_FILE}..."

# Stop applications
kubectl scale deployment userservice --replicas=0 -n freelance-platform
kubectl scale deployment taskservice --replicas=0 -n freelance-platform
kubectl scale deployment orchestrator --replicas=0 -n freelance-platform

# Download backup from S3
aws s3 cp "s3://your-backup-bucket/db-backups/${BACKUP_FILE}" "/tmp/"

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip "/tmp/${BACKUP_FILE}"
    BACKUP_FILE=${BACKUP_FILE%.gz}
fi

# Drop and recreate database
dropdb -h postgres -U postgres freelance_platform
createdb -h postgres -U postgres freelance_platform

# Restore data
pg_restore -h postgres -U postgres -d freelance_platform "/tmp/${BACKUP_FILE}"

# Restart applications
kubectl scale deployment userservice --replicas=3 -n freelance-platform
kubectl scale deployment taskservice --replicas=2 -n freelance-platform
kubectl scale deployment orchestrator --replicas=2 -n freelance-platform

# Verify health
sleep 30
kubectl get pods -n freelance-platform
curl http://userservice:50051/health
curl http://taskservice:50052/health
curl http://orchestrator:50053/health

echo "Database restore completed."
```

### Security Operations

#### Certificate Management

```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/certs/app.crt -noout -dates

# Renew certificates (Let's Encrypt)
certbot renew --quiet
systemctl reload nginx

# Update Kubernetes TLS secrets
kubectl create secret tls app-tls \
    --cert=/etc/letsencrypt/live/app.domain.com/fullchain.pem \
    --key=/etc/letsencrypt/live/app.domain.com/privkey.pem \
    --dry-run=client -o yaml | kubectl apply -f -
```

#### Security Scanning

```bash
# Scan container images for vulnerabilities
trivy image freelance-platform/userservice:latest

# Check for security updates
apt list --upgradable | grep -i security

# Audit file permissions
find /app -type f -perm /o+w -ls  # World-writable files
find /app -type f -perm /u+s -ls   # SUID files
```

#### Access Management

```bash
# Review database access logs
tail -f /var/log/postgresql/postgresql.log | grep -E "(CONNECT|DISCONNECT|ERROR)"

# Check active sessions
psql -c "SELECT usename, application_name, client_addr, state, query_start FROM pg_stat_activity;"

# Rotate API keys (example)
kubectl create secret generic api-keys \
    --from-literal=jwt-secret="$(openssl rand -base64 32)" \
    --dry-run=client -o yaml | kubectl apply -f -
```

### Capacity Planning

#### Resource Monitoring

```bash
# Check current resource usage
kubectl top nodes
kubectl top pods -n freelance-platform

# Database storage growth
psql -c "
SELECT pg_size_pretty(pg_database_size('freelance_platform')) as current_size;
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# NATS message rates
curl -s http://nats:8222/statsz | jq '.in_msgs, .out_msgs, .in_bytes, .out_bytes'
```

#### Scaling Guidelines

```yaml
# CPU-based scaling thresholds
User Service:
  target_cpu: 70%
  min_replicas: 2
  max_replicas: 10
  
Task Service:
  target_cpu: 70%
  min_replicas: 2
  max_replicas: 8
  
Orchestrator:
  target_cpu: 60%  # Lower threshold due to ML processing
  min_replicas: 2
  max_replicas: 6

# Memory-based scaling
memory_threshold: 80%
scale_up_threshold: 85%
scale_down_threshold: 40%
```

#### Performance Benchmarks

```bash
# Baseline performance targets
API Response Time (p95): < 200ms
API Response Time (p99): < 500ms
Matching Success Rate: > 90%
Database Connection Pool: < 80% usage
Error Rate: < 1%

# Load testing targets
Concurrent Users: 1000
Requests per Second: 500
Task Creation Rate: 100/minute
Matching Throughput: 200 matches/minute
```

### Incident Response

#### Severity Levels

```yaml
P0 (Critical - 15min response):
  - Total service outage
  - Data corruption
  - Security breach
  
P1 (High - 1hr response):  
  - Single service down
  - Significant performance degradation
  - Failed deployments
  
P2 (Medium - 4hr response):
  - Non-critical feature issues
  - Elevated error rates
  - Monitoring alerts
  
P3 (Low - Next business day):
  - Documentation issues
  - Enhancement requests
  - Minor bugs
```

#### Incident Response Checklist

```markdown
## P0/P1 Incident Response

1. **Acknowledge** (within SLA)
   - [ ] Update incident status
   - [ ] Notify stakeholders
   - [ ] Assign incident commander

2. **Assess** (5-10 minutes)
   - [ ] Check service health dashboards
   - [ ] Review recent deployments/changes
   - [ ] Identify affected services/users

3. **Mitigate** (immediate)
   - [ ] Rollback recent changes if applicable
   - [ ] Scale up resources if needed
   - [ ] Implement temporary workarounds

4. **Investigate** (parallel to mitigation)
   - [ ] Collect logs and metrics
   - [ ] Identify root cause
   - [ ] Document findings

5. **Resolve** 
   - [ ] Implement permanent fix
   - [ ] Verify resolution
   - [ ] Update monitoring/alerts

6. **Post-Incident**
   - [ ] Conduct post-mortem
   - [ ] Update runbooks
   - [ ] Implement preventive measures
```

## Useful Commands

### Daily Operations

```bash
# Check overall system health
kubectl get pods -n freelance-platform -o wide
docker-compose ps
curl -s http://localhost:8080/metrics | grep up

# View service logs
kubectl logs -f deployment/userservice -n freelance-platform --tail=100
docker-compose logs --tail=100 userservice

# Check resource usage
kubectl top pods -n freelance-platform
docker stats --no-stream

# Database quick checks
psql -c "SELECT count(*) FROM users WHERE is_online = true;"
psql -c "SELECT count(*) FROM tasks WHERE status = 'OPEN';"
psql -c "SELECT count(*) FROM proposals WHERE created_at > NOW() - INTERVAL '1 hour';"
```

### Emergency Commands

```bash
# Restart services
kubectl rollout restart deployment/userservice -n freelance-platform
docker-compose restart userservice

# Scale services
kubectl scale deployment/userservice --replicas=5 -n freelance-platform
docker-compose up -d --scale userservice=3

# Emergency database maintenance
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < now() - interval '1 hour';"

# Clear Redis cache
redis-cli FLUSHDB

# Purge NATS subjects
nats stream purge TASKS --force
```

---

**Emergency Contacts:**
- On-call Engineer: +1-555-0123
- Database Admin: +1-555-0124  
- Security Team: security@company.com
- Management: management@company.com