"""Authentication service for gateway."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import asyncpg
import bcrypt
import structlog
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import Settings
from app.models.user import User, UserCreate, UserLogin, UserResponse, UserType
from app.models.session import UserSession, SessionCreate
from app.models.auth import AuthResponse, TokenData, PasswordReset, EmailVerification

logger = structlog.get_logger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service."""
    
    def __init__(self, settings: Settings, db_pool: asyncpg.Pool):
        self.settings = settings
        self.db_pool = db_pool
        self.secret_key = settings.jwt_secret_key
        self.algorithm = "HS256"
        self.access_token_expire_minutes = settings.jwt_access_token_expire_minutes
        self.refresh_token_expire_days = settings.jwt_refresh_token_expire_days

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create an access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create a refresh token."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode a token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("user_id")
            email: str = payload.get("email")
            user_type: str = payload.get("user_type")
            exp: int = payload.get("exp")
            iat: int = payload.get("iat")
            
            if user_id is None or email is None:
                return None
                
            return TokenData(
                user_id=user_id,
                email=email,
                user_type=user_type,
                exp=exp,
                iat=iat
            )
        except JWTError:
            return None

    def hash_token(self, token: str) -> str:
        """Hash a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def create_user(self, user_data: UserCreate, ip_address: Optional[str] = None) -> Tuple[UserResponse, AuthResponse]:
        """Create a new user."""
        logger.info("Creating user", email=user_data.email, user_type=user_data.user_type.value)
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Check if user already exists
                existing_user = await conn.fetchrow(
                    "SELECT user_id FROM users WHERE email = $1",
                    user_data.email
                )
                if existing_user:
                    logger.warning("User already exists", email=user_data.email)
                    raise ValueError("User with this email already exists")

                # Create user
                user_id = str(uuid.uuid4())
                password_hash = self.get_password_hash(user_data.password)
                salt = secrets.token_hex(32)
                
                logger.info("Inserting user into database", user_id=user_id, user_type=user_data.user_type.value.lower())
                await conn.execute("""
                    INSERT INTO users (user_id, email, display_name, user_type, password_hash, salt, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                """, user_id, user_data.email, user_data.display_name, user_data.user_type.value.lower(), password_hash, salt)

                # Create user credentials record
                logger.info("Creating user credentials", user_id=user_id)
                await conn.execute("""
                    INSERT INTO user_credentials (user_id, credential_type, credential_value, salt, is_active)
                    VALUES ($1, $2, $3, $4, $5)
                """, user_id, "password", password_hash, salt, True)

                # Create user response
                user_response = UserResponse(
                    user_id=user_id,
                    email=user_data.email,
                    display_name=user_data.display_name,
                    user_type=user_data.user_type,
                    email_verified=False,
                    last_login=None,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )

                # Create tokens
                token_data = {
                    "user_id": user_id,
                    "email": user_data.email,
                    "user_type": user_data.user_type.value.lower()
                }
                
                logger.info("Creating tokens", user_id=user_id)
                access_token = self.create_access_token(token_data)
                refresh_token = self.create_refresh_token(token_data)
                
                # Store session
                access_token_hash = self.hash_token(access_token)
                refresh_token_hash = self.hash_token(refresh_token)
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
                
                logger.info("Storing session", user_id=user_id)
                await conn.execute("""
                    INSERT INTO user_sessions (user_id, session_type, access_token_hash, refresh_token_hash, expires_at, refresh_expires_at, ip_address, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, user_id, "web_app", access_token_hash, refresh_token_hash, expires_at, refresh_expires_at, ip_address, True)

                # Log registration
                await self._log_auth_event(
                    conn, user_id, "register", ip_address, None, True, None
                )

                auth_response = AuthResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_in=self.access_token_expire_minutes * 60,
                    user=user_response.dict()
                )

                return user_response, auth_response

    async def authenticate_user(self, user_data: UserLogin, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Tuple[UserResponse, AuthResponse]:
        """Authenticate a user."""
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Get user with credentials
                logger.info("Looking for user", email=user_data.email)
                user_row = await conn.fetchrow("""
                    SELECT user_id, email, display_name, user_type, password_hash, salt, email_verified, last_login, created_at, updated_at
                    FROM users WHERE email = $1
                """, user_data.email)
                logger.info("User query result", found=user_row is not None, email=user_data.email)

                if not user_row:
                    logger.warning("User not found", email=user_data.email)
                    await self._log_auth_event(
                        conn, None, "failed_login", ip_address, user_agent, False, "User not found"
                    )
                    raise ValueError("Invalid credentials")
                
                if not user_row["password_hash"]:
                    logger.warning("User has no password", email=user_data.email, user_id=user_row["user_id"])
                    await self._log_auth_event(
                        conn, user_row["user_id"], "failed_login", ip_address, user_agent, False, "No password set"
                    )
                    raise ValueError("Invalid credentials")

                # Verify password
                logger.info("Verifying password", email=user_data.email, has_password=bool(user_row["password_hash"]))
                password_valid = self.verify_password(user_data.password, user_row["password_hash"])
                logger.info("Password verification result", email=user_data.email, valid=password_valid)
                
                if not password_valid:
                    logger.warning("Invalid password", email=user_data.email, user_id=user_row["user_id"])
                    await self._log_auth_event(
                        conn, user_row["user_id"], "failed_login", ip_address, user_agent, False, "Invalid password"
                    )
                    raise ValueError("Invalid credentials")

                # Update last login
                await conn.execute("""
                    UPDATE users SET last_login = NOW() WHERE user_id = $1
                """, user_row["user_id"])

                # Create user response
                user_response = UserResponse(
                    user_id=str(user_row["user_id"]),
                    email=user_row["email"],
                    display_name=user_row["display_name"],
                    user_type=UserType(user_row["user_type"].upper()),
                    email_verified=user_row["email_verified"],
                    last_login=datetime.now(timezone.utc),
                    created_at=user_row["created_at"],
                    updated_at=user_row["updated_at"]
                )

                # Create tokens
                token_data = {
                    "user_id": str(user_row["user_id"]),
                    "email": user_row["email"],
                    "user_type": user_row["user_type"]
                }
                
                access_token = self.create_access_token(token_data)
                refresh_token = self.create_refresh_token(token_data)
                
                # Store session
                access_token_hash = self.hash_token(access_token)
                refresh_token_hash = self.hash_token(refresh_token)
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
                
                await conn.execute("""
                    INSERT INTO user_sessions (user_id, session_type, access_token_hash, refresh_token_hash, expires_at, refresh_expires_at, ip_address, user_agent, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """, user_row["user_id"], "web_app", access_token_hash, refresh_token_hash, expires_at, refresh_expires_at, ip_address, user_agent, True)

                # Log successful login
                await self._log_auth_event(
                    conn, user_row["user_id"], "login", ip_address, user_agent, True, None
                )

                auth_response = AuthResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_in=self.access_token_expire_minutes * 60,
                    user=user_response.dict()
                )

                return user_response, auth_response

    async def refresh_token(self, refresh_token: str, ip_address: Optional[str] = None) -> AuthResponse:
        """Refresh access token using refresh token."""
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Verify refresh token
                token_data = self.verify_token(refresh_token)
                if not token_data or token_data.user_id is None:
                    raise ValueError("Invalid refresh token")

                # Check if refresh token exists and is active
                refresh_token_hash = self.hash_token(refresh_token)
                session_row = await conn.fetchrow("""
                    SELECT user_id, refresh_expires_at FROM user_sessions 
                    WHERE refresh_token_hash = $1 AND is_active = TRUE
                """, refresh_token_hash)

                if not session_row:
                    raise ValueError("Invalid refresh token")
                
                # Check if refresh token is expired
                now = datetime.now(timezone.utc)
                if session_row["refresh_expires_at"] < now:
                    raise ValueError("Refresh token expired")

                # Get user data
                user_row = await conn.fetchrow("""
                    SELECT user_id, email, display_name, user_type, email_verified, last_login, created_at, updated_at
                    FROM users WHERE user_id = $1
                """, token_data.user_id)

                if not user_row:
                    raise ValueError("User not found")

                # Create new tokens
                new_token_data = {
                    "user_id": str(user_row["user_id"]),
                    "email": user_row["email"],
                    "user_type": user_row["user_type"]
                }
                
                new_access_token = self.create_access_token(new_token_data)
                new_refresh_token = self.create_refresh_token(new_token_data)
                
                # Update session with new tokens
                new_access_token_hash = self.hash_token(new_access_token)
                new_refresh_token_hash = self.hash_token(new_refresh_token)
                new_expires_at = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
                new_refresh_expires_at = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
                
                await conn.execute("""
                    UPDATE user_sessions 
                    SET access_token_hash = $1, refresh_token_hash = $2, expires_at = $3, refresh_expires_at = $4, ip_address = $5
                    WHERE refresh_token_hash = $6
                """, new_access_token_hash, new_refresh_token_hash, new_expires_at, new_refresh_expires_at, ip_address, refresh_token_hash)

                # Log token refresh
                await self._log_auth_event(
                    conn, user_row["user_id"], "token_refresh", ip_address, None, True, None
                )

                # Create user response
                user_response = UserResponse(
                    user_id=str(user_row["user_id"]),
                    email=user_row["email"],
                    display_name=user_row["display_name"],
                    user_type=UserType(user_row["user_type"].upper()),
                    email_verified=user_row["email_verified"],
                    last_login=user_row["last_login"],
                    created_at=user_row["created_at"],
                    updated_at=user_row["updated_at"]
                )

                return AuthResponse(
                    access_token=new_access_token,
                    refresh_token=new_refresh_token,
                    expires_in=self.access_token_expire_minutes * 60,
                    user=user_response.dict()
                )

    async def logout(self, access_token: str, refresh_token: Optional[str] = None) -> bool:
        """Logout user by invalidating tokens."""
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Get token data
                token_data = self.verify_token(access_token)
                if not token_data:
                    return False

                # Hash tokens for blacklist
                access_token_hash = self.hash_token(access_token)
                expires_at = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
                
                # Add access token to blacklist
                await conn.execute("""
                    INSERT INTO token_blacklist (token_hash, user_id, expires_at, reason)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (token_hash) DO NOTHING
                """, access_token_hash, token_data.user_id, expires_at, "logout")

                # Add refresh token to blacklist if provided
                if refresh_token:
                    refresh_token_hash = self.hash_token(refresh_token)
                    refresh_expires_at = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
                    await conn.execute("""
                        INSERT INTO token_blacklist (token_hash, user_id, expires_at, reason)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (token_hash) DO NOTHING
                    """, refresh_token_hash, token_data.user_id, refresh_expires_at, "logout")

                # Deactivate session
                await conn.execute("""
                    UPDATE user_sessions 
                    SET is_active = FALSE 
                    WHERE access_token_hash = $1
                """, access_token_hash)

                # Log logout
                await self._log_auth_event(
                    conn, token_data.user_id, "logout", None, None, True, None
                )

                return True

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        async with self.db_pool.acquire() as conn:
            token_hash = self.hash_token(token)
            result = await conn.fetchval("""
                SELECT 1 FROM token_blacklist 
                WHERE token_hash = $1 AND expires_at > NOW()
            """, token_hash)
            return result is not None

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID."""
        async with self.db_pool.acquire() as conn:
            user_row = await conn.fetchrow("""
                SELECT user_id, email, display_name, user_type, email_verified, last_login, created_at, updated_at
                FROM users WHERE user_id = $1
            """, user_id)

            if not user_row:
                return None

            return UserResponse(
                user_id=str(user_row["user_id"]),
                email=user_row["email"],
                display_name=user_row["display_name"],
                user_type=UserType(user_row["user_type"].upper()),
                email_verified=user_row["email_verified"],
                last_login=user_row["last_login"],
                created_at=user_row["created_at"],
                updated_at=user_row["updated_at"]
            )

    async def _log_auth_event(
        self, 
        conn: asyncpg.Connection, 
        user_id: Optional[str], 
        event_type: str, 
        ip_address: Optional[str], 
        user_agent: Optional[str], 
        success: bool, 
        error_message: Optional[str]
    ) -> None:
        """Log authentication event."""
        try:
            await conn.execute("""
                INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent, success, error_message, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, user_id, event_type, ip_address, user_agent, success, error_message)
        except Exception as e:
            logger.error("Failed to log auth event", error=str(e))
