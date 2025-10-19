-- 002_add_vector_support.up.sql
-- Add vector embeddings support for ML-based matching (Phase 3 feature)

-- Enable vector extension for semantic similarity matching
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding vectors to developer profiles
ALTER TABLE developer_profiles 
ADD COLUMN embedding vector(384); -- 384-dimensional embeddings (BERT-base)

-- Add embedding vectors to tasks  
ALTER TABLE tasks
ADD COLUMN embedding vector(384);

-- Create HNSW indices for fast vector similarity search
-- Using cosine distance which is ideal for normalized embeddings
CREATE INDEX idx_developer_embedding_cosine 
ON developer_profiles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_task_embedding_cosine 
ON tasks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (better for smaller datasets)
-- CREATE INDEX idx_developer_embedding_ivfflat 
-- ON developer_profiles 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Embeddings metadata tracking
CREATE TABLE embedding_metadata (
    entity_id UUID NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'task')),
    model_name VARCHAR(100) NOT NULL, -- e.g., "all-MiniLM-L6-v2", "bert-base-uncased"
    model_version VARCHAR(50) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    quality_score DECIMAL(3,2), -- Optional quality/confidence score
    
    PRIMARY KEY (entity_id, entity_type)
);

CREATE INDEX idx_embedding_metadata_model ON embedding_metadata(model_name, model_version);
CREATE INDEX idx_embedding_metadata_generated ON embedding_metadata(generated_at DESC);

-- Function to calculate cosine similarity (for application use)
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
BEGIN
    RETURN 1 - (a <=> b); -- PGVector's cosine distance operator
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Function to find similar developers by embedding
CREATE OR REPLACE FUNCTION find_similar_developers(
    task_embedding vector,
    skill_filter TEXT[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0.0,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    user_id UUID,
    similarity_score DECIMAL,
    rating DECIMAL,
    skill_tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.user_id,
        (1 - (dp.embedding <=> task_embedding))::DECIMAL as similarity_score,
        dp.rating,
        dp.skill_tags
    FROM developer_profiles dp
    WHERE dp.embedding IS NOT NULL
      AND dp.presence_status = 'searching'
      AND dp.rating >= min_rating
      AND (skill_filter IS NULL OR dp.skill_tags && skill_filter)
    ORDER BY dp.embedding <=> task_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find similar tasks (for analytics/recommendations)
CREATE OR REPLACE FUNCTION find_similar_tasks(
    user_embedding vector,
    budget_min DECIMAL DEFAULT 0,
    budget_max DECIMAL DEFAULT 999999,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    task_id UUID,
    similarity_score DECIMAL,
    title VARCHAR,
    budget_lower_bound DECIMAL,
    budget_upper_bound DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_id,
        (1 - (t.embedding <=> user_embedding))::DECIMAL as similarity_score,
        t.title,
        t.budget_lower_bound,
        t.budget_upper_bound
    FROM tasks t
    WHERE t.embedding IS NOT NULL
      AND t.status = 'open'
      AND t.budget_lower_bound >= budget_min
      AND (t.budget_upper_bound <= budget_max OR t.budget_upper_bound IS NULL)
    ORDER BY t.embedding <=> user_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Materialized view for precomputed user similarities (optional optimization)
CREATE MATERIALIZED VIEW user_similarity_matrix AS
SELECT 
    dp1.user_id as user_1,
    dp2.user_id as user_2,
    (1 - (dp1.embedding <=> dp2.embedding))::DECIMAL(5,4) as similarity
FROM developer_profiles dp1
CROSS JOIN developer_profiles dp2
WHERE dp1.user_id < dp2.user_id  -- Avoid duplicates and self-joins
  AND dp1.embedding IS NOT NULL 
  AND dp2.embedding IS NOT NULL
  AND (dp1.embedding <=> dp2.embedding) < 0.5; -- Only store meaningful similarities

CREATE UNIQUE INDEX idx_user_similarity_users ON user_similarity_matrix(user_1, user_2);
CREATE INDEX idx_user_similarity_score ON user_similarity_matrix(similarity DESC);

-- Function to refresh similarity matrix (run as background job)
CREATE OR REPLACE FUNCTION refresh_user_similarities()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity_matrix;
END;
$$ LANGUAGE plpgsql;

-- Statistics tracking for embeddings
CREATE TABLE embedding_statistics (
    stat_date DATE DEFAULT CURRENT_DATE,
    entity_type VARCHAR(20) NOT NULL,
    total_count INTEGER DEFAULT 0,
    with_embeddings INTEGER DEFAULT 0,
    avg_dimension INTEGER,
    quality_stats JSONB DEFAULT '{}'::jsonb,
    
    PRIMARY KEY (stat_date, entity_type)
);

-- Function to update embedding statistics
CREATE OR REPLACE FUNCTION update_embedding_statistics()
RETURNS void AS $$
BEGIN
    -- Update user embeddings stats
    INSERT INTO embedding_statistics (stat_date, entity_type, total_count, with_embeddings, avg_dimension)
    SELECT 
        CURRENT_DATE,
        'user',
        COUNT(*),
        COUNT(embedding),
        AVG(CASE WHEN embedding IS NOT NULL THEN array_length(embedding::float[], 1) END)::INTEGER
    FROM developer_profiles
    ON CONFLICT (stat_date, entity_type) DO UPDATE SET
        total_count = EXCLUDED.total_count,
        with_embeddings = EXCLUDED.with_embeddings,
        avg_dimension = EXCLUDED.avg_dimension;
    
    -- Update task embeddings stats
    INSERT INTO embedding_statistics (stat_date, entity_type, total_count, with_embeddings, avg_dimension)
    SELECT 
        CURRENT_DATE,
        'task',
        COUNT(*),
        COUNT(embedding),
        AVG(CASE WHEN embedding IS NOT NULL THEN array_length(embedding::float[], 1) END)::INTEGER
    FROM tasks
    ON CONFLICT (stat_date, entity_type) DO UPDATE SET
        total_count = EXCLUDED.total_count,
        with_embeddings = EXCLUDED.with_embeddings,
        avg_dimension = EXCLUDED.avg_dimension;
END;
$$ LANGUAGE plpgsql;