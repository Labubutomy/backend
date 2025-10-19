-- 001_initial_schema.down.sql
-- Rollback script for initial schema

-- Drop views first
DROP VIEW IF EXISTS open_tasks;
DROP VIEW IF EXISTS active_developers;

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_data();

-- Drop update trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS performance_metrics;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS delivery_attempts;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS client_profiles;
DROP TABLE IF EXISTS developer_profiles;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS users;

-- Drop extensions (be careful in production - other apps might use them)
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "uuid-ossp";