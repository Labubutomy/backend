-- 002_add_vector_support.down.sql
-- Rollback vector embeddings support

-- Drop statistics function and table
DROP FUNCTION IF EXISTS update_embedding_statistics();
DROP TABLE IF EXISTS embedding_statistics;

-- Drop similarity functions and views
DROP FUNCTION IF EXISTS refresh_user_similarities();
DROP MATERIALIZED VIEW IF EXISTS user_similarity_matrix;
DROP FUNCTION IF EXISTS find_similar_tasks(vector, DECIMAL, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS find_similar_developers(vector, TEXT[], DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS cosine_similarity(vector, vector);

-- Drop embedding metadata table
DROP TABLE IF EXISTS embedding_metadata;

-- Drop vector indices
DROP INDEX IF EXISTS idx_task_embedding_cosine;
DROP INDEX IF EXISTS idx_developer_embedding_cosine;

-- Remove embedding columns
ALTER TABLE tasks DROP COLUMN IF EXISTS embedding;
ALTER TABLE developer_profiles DROP COLUMN IF EXISTS embedding;

-- Drop vector extension (be careful in production)
-- DROP EXTENSION IF EXISTS vector;