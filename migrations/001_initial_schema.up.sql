-- 001_initial_schema.up.sql
-- Initial database schema for high-performance freelance platform

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- Users table (developers and clients)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('developer', 'client', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer profiles with optimized indices for fast matching
CREATE TABLE developer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    skill_tags TEXT[] DEFAULT '{}' NOT NULL,
    hourly_rate DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    response_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (response_rate >= 0.0 AND response_rate <= 1.0),
    acceptance_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (acceptance_rate >= 0.0 AND acceptance_rate <= 1.0),
    avg_response_time_hours DECIMAL(8,2) DEFAULT 0.0,
    timezone VARCHAR(50),
    preferred_domains TEXT[] DEFAULT '{}',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    presence_status VARCHAR(20) DEFAULT 'offline' CHECK (presence_status IN ('offline', 'idle', 'searching')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical indices for O(1) candidate lookup optimization
CREATE INDEX idx_developer_skill_tags ON developer_profiles USING GIN(skill_tags);
CREATE INDEX idx_developer_rating_desc ON developer_profiles(rating DESC) WHERE presence_status = 'searching';
CREATE INDEX idx_developer_presence_active ON developer_profiles(presence_status, last_active DESC) WHERE presence_status IN ('searching', 'idle');
CREATE INDEX idx_developer_hourly_rate ON developer_profiles(hourly_rate) WHERE presence_status = 'searching';
CREATE INDEX idx_developer_response_metrics ON developer_profiles(response_rate DESC, acceptance_rate DESC);

-- Create IMMUTABLE function for text search index
CREATE OR REPLACE FUNCTION skills_to_tsvector(skill_tags TEXT[])
RETURNS TSVECTOR AS $$
BEGIN
    RETURN to_tsvector('english', array_to_string(skill_tags, ' '));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Text search index for fuzzy skill matching
CREATE INDEX idx_developer_skills_text ON developer_profiles USING gin(skills_to_tsvector(skill_tags));

-- Client profiles
CREATE TABLE client_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    billing_email VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    total_spent DECIMAL(12,2) DEFAULT 0.0,
    avg_rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks with optimized schema for fast matching
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(user_id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    skill_tags TEXT[] DEFAULT '{}' NOT NULL,
    budget_lower_bound DECIMAL(10,2),
    budget_upper_bound DECIMAL(10,2),
    repository_url VARCHAR(1000),
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'paused', 'completed', 'cancelled')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invited_only')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical indices for task matching performance
CREATE INDEX idx_tasks_skill_tags ON tasks USING GIN(skill_tags);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC) WHERE status = 'open';
CREATE INDEX idx_tasks_budget_range ON tasks(budget_lower_bound, budget_upper_bound) WHERE status = 'open';
CREATE INDEX idx_tasks_priority_created ON tasks(priority DESC, created_at DESC) WHERE status = 'open';

-- Full-text search for task titles and descriptions
CREATE INDEX idx_tasks_text_search ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Proposals table - core matching results
CREATE TABLE proposals (
    proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(task_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    score DECIMAL(5,4) CHECK (score >= 0.0 AND score <= 1.0),
    status VARCHAR(50) DEFAULT 'proposed' CHECK (status IN ('proposed', 'delivered', 'accepted', 'rejected', 'expired', 'cancelled')),
    strategy_used VARCHAR(50), -- matching strategy identifier
    delivery_channel VARCHAR(20), -- websocket, push, email
    delivered_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite unique constraint to prevent duplicate proposals
    UNIQUE(task_id, user_id)
);

-- Indices for proposal queries and analytics
CREATE INDEX idx_proposals_task_status ON proposals(task_id, status);
CREATE INDEX idx_proposals_user_status ON proposals(user_id, status, created_at DESC);
CREATE INDEX idx_proposals_delivered_at ON proposals(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_proposals_score_desc ON proposals(score DESC, created_at DESC);
CREATE INDEX idx_proposals_expires_at ON proposals(expires_at) WHERE status = 'delivered';

-- Delivery tracking for observability and retries
CREATE TABLE delivery_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(proposal_id),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'acknowledged')),
    error_message TEXT,
    latency_ms INTEGER,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_delivery_attempts_proposal ON delivery_attempts(proposal_id, attempted_at DESC);
CREATE INDEX idx_delivery_attempts_status ON delivery_attempts(status, attempted_at DESC);

-- Skills reference table for normalization and statistics
CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    synonyms TEXT[] DEFAULT '{}',
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate common skills for tech development
INSERT INTO skills (skill_name, category, synonyms) VALUES
('Go', 'Programming Languages', ARRAY['Golang', 'go-lang']),
('JavaScript', 'Programming Languages', ARRAY['JS', 'ECMAScript', 'Node.js']),
('Python', 'Programming Languages', ARRAY['py']),
('React', 'Frontend Frameworks', ARRAY['ReactJS', 'React.js']),
('Docker', 'DevOps', ARRAY['Containerization']),
('Kubernetes', 'DevOps', ARRAY['K8s', 'k8s']),
('PostgreSQL', 'Databases', ARRAY['Postgres', 'PG']),
('Redis', 'Databases', ARRAY['Redis Cache']),
('gRPC', 'APIs', ARRAY['grpc']),
('REST API', 'APIs', ARRAY['RESTful', 'REST']),
('Machine Learning', 'AI/ML', ARRAY['ML', 'AI']),
('Microservices', 'Architecture', ARRAY['MSA']);

-- User sessions for WebSocket presence tracking
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('websocket', 'mobile_app', 'web_app')),
    connection_id VARCHAR(255), -- WebSocket connection identifier
    ip_address INET,
    user_agent TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Partial indexes with fixed time reference instead of NOW()
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, last_heartbeat DESC);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Audit log for critical events
CREATE TABLE audit_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(user_id),
    changes JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_events_user ON audit_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_events_type ON audit_events(event_type, created_at DESC);

-- Performance monitoring table
CREATE TABLE performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    component VARCHAR(50) NOT NULL,
    value DECIMAL(12,4) NOT NULL,
    labels JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition performance metrics by day for efficient cleanup
CREATE INDEX idx_performance_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_performance_metrics_component ON performance_metrics(component, recorded_at DESC);

-- Update triggers for maintaining updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developer_profiles_updated_at BEFORE UPDATE ON developer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Delete expired user sessions
    DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- Delete old performance metrics (keep 30 days)
    DELETE FROM performance_metrics WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    -- Delete old audit events (keep 90 days)  
    DELETE FROM audit_events WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Archive old delivery attempts (keep 7 days)
    DELETE FROM delivery_attempts WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Views for common queries optimization
CREATE VIEW active_developers AS
SELECT 
    dp.user_id,
    u.display_name,
    dp.skill_tags,
    dp.hourly_rate,
    dp.rating,
    dp.response_rate,
    dp.acceptance_rate,
    dp.presence_status,
    dp.last_active
FROM developer_profiles dp
JOIN users u ON dp.user_id = u.user_id
WHERE dp.presence_status IN ('searching', 'idle')
  AND dp.last_active > NOW() - INTERVAL '1 hour';

CREATE VIEW open_tasks AS
SELECT 
    t.*,
    cp.company_name,
    u.display_name as client_name
FROM tasks t
JOIN users u ON t.client_id = u.user_id
LEFT JOIN client_profiles cp ON u.user_id = cp.user_id
WHERE t.status = 'open'
  AND (t.expires_at IS NULL OR t.expires_at > NOW());

-- Performance optimization: analyze tables
ANALYZE users;
ANALYZE developer_profiles;
ANALYZE tasks;
ANALYZE proposals;
ANALYZE delivery_attempts;