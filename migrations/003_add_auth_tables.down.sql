-- 003_add_auth_tables.down.sql
-- Remove authentication tables

-- Drop views
DROP VIEW IF EXISTS user_auth_status;
DROP VIEW IF EXISTS active_user_sessions;

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_auth_tokens();

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_credentials_updated_at ON user_credentials;

-- Drop tables
DROP TABLE IF EXISTS auth_audit_log;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS token_blacklist;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_credentials;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS last_login;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS salt;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
