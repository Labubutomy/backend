-- 003_add_auth_tables.up.sql
-- Add authentication tables for gateway service

-- Add password fields to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN salt VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;

-- Create user_credentials table for additional auth methods
CREATE TABLE user_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL CHECK (credential_type IN ('password', 'oauth_google', 'oauth_github')),
    credential_value TEXT, -- hashed password or OAuth token
    salt VARCHAR(255), -- for password credentials
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_sessions table for JWT token management
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('websocket', 'mobile_app', 'web_app')),
    connection_id VARCHAR(255),
    access_token_hash VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    refresh_expires_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create token_blacklist table for logout functionality
CREATE TABLE token_blacklist (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(50) DEFAULT 'logout' CHECK (reason IN ('logout', 'security', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: password_reset_tokens and email_verification_tokens tables
-- are not currently used in the gateway implementation

-- Create audit_log table for authentication events
CREATE TABLE auth_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('login', 'logout', 'register', 'password_reset', 'email_verification', 'failed_login', 'token_refresh')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id, credential_type);
CREATE INDEX idx_user_credentials_active ON user_credentials(is_active, created_at DESC);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_access_token ON user_sessions(access_token_hash);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, last_heartbeat DESC);

CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX idx_token_blacklist_user ON token_blacklist(user_id);

-- Note: password_reset_tokens and email_verification_tokens indexes
-- are not needed as these tables are not currently used

CREATE INDEX idx_auth_audit_log_user ON auth_audit_log(user_id, created_at DESC);
CREATE INDEX idx_auth_audit_log_event ON auth_audit_log(event_type, created_at DESC);
CREATE INDEX idx_auth_audit_log_ip ON auth_audit_log(ip_address, created_at DESC);

-- Add update triggers
CREATE TRIGGER update_user_credentials_updated_at 
    BEFORE UPDATE ON user_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_auth_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- Delete expired blacklisted tokens
    DELETE FROM token_blacklist WHERE expires_at < NOW();
    
    -- Delete old audit logs (keep 90 days)
    DELETE FROM auth_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create view for active user sessions
CREATE VIEW active_user_sessions AS
SELECT 
    us.session_id,
    us.user_id,
    u.email,
    u.display_name,
    u.user_type,
    us.ip_address,
    us.user_agent,
    us.created_at,
    us.expires_at
FROM user_sessions us
JOIN users u ON us.user_id = u.user_id
WHERE us.is_active = TRUE 
  AND us.expires_at > NOW();

-- Create view for user authentication status
CREATE VIEW user_auth_status AS
SELECT 
    u.user_id,
    u.email,
    u.display_name,
    u.user_type,
    u.email_verified,
    u.last_login,
    CASE 
        WHEN uc.credential_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as has_password,
    CASE 
        WHEN us.session_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as is_online
FROM users u
LEFT JOIN user_credentials uc ON u.user_id = uc.user_id 
    AND uc.credential_type = 'password' 
    AND uc.is_active = TRUE
LEFT JOIN user_sessions us ON u.user_id = us.user_id 
    AND us.is_active = TRUE 
    AND us.expires_at > NOW();
