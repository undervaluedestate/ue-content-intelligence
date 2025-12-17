"""
Application configuration management.
Loads settings from environment variables with validation.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_ENV: str = "development"
    SECRET_KEY: str
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Content Intelligence System"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Database
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # AI Services
    GOOGLE_API_KEY: Optional[str] = None  # Google Gemini (free tier available)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_AI_MODEL: str = "gemini-pro"  # Default to Gemini
    CONTENT_TEMPERATURE: float = 0.7
    
    # Twitter/X API
    TWITTER_BEARER_TOKEN: Optional[str] = None
    TWITTER_API_KEY: Optional[str] = None
    TWITTER_API_SECRET: Optional[str] = None
    TWITTER_ACCESS_TOKEN: Optional[str] = None
    TWITTER_ACCESS_SECRET: Optional[str] = None
    
    # Email - Gmail API
    USE_GMAIL_API: bool = True  # Set to False to use Resend instead
    GMAIL_CREDENTIALS_PATH: str = "credentials.json"  # Path to OAuth2 credentials
    GMAIL_TOKEN_PATH: str = "token.pickle"  # Path to store OAuth2 token
    
    # Gmail OAuth2 credentials (alternative to file-based auth)
    GMAIL_API_CLIENT_ID: Optional[str] = None
    GMAIL_API_CLIENT_SECRET: Optional[str] = None
    GMAIL_API_REDIRECT_URI: Optional[str] = None
    GMAIL_API_REFRESH_TOKEN: Optional[str] = None
    GMAIL_USER: Optional[str] = None
    GMAIL_PASS: Optional[str] = None  # App password (simpler alternative to OAuth2)
    
    # Email - Resend (legacy, kept for backward compatibility)
    RESEND_API_KEY: Optional[str] = None
    
    # Email - Common settings
    ADMIN_EMAIL: str = "admin@example.com"
    DIGEST_RECIPIENTS: str = "team@example.com"
    
    @property
    def digest_recipients_list(self) -> List[str]:
        return [email.strip() for email in self.DIGEST_RECIPIENTS.split(",")]
    
    # Meta Business API
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_ACCESS_TOKEN: Optional[str] = None
    
    # Content Settings
    MAX_TRENDS_PER_CYCLE: int = 20
    RELEVANCE_THRESHOLD: int = 60
    
    # Scheduling
    INGESTION_INTERVAL_HOURS: int = 2
    DIGEST_TIME: str = "08:00"
    DIGEST_TIMEZONE: str = "Africa/Lagos"
    
    # Feature Flags
    ENABLE_TWITTER_INGESTION: bool = True
    ENABLE_GOOGLE_NEWS: bool = True
    ENABLE_EMAIL_DIGEST: bool = True
    ENABLE_NATIVE_SCHEDULING: bool = False
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Nigerian Context - Pre-configured Keywords
    NIGERIAN_KEYWORDS: List[str] = [
        "real estate", "land", "rent", "housing", "mortgage", "property",
        "power", "gas", "inflation", "naira", "policy", "investment",
        "lagos", "abuja", "nigeria", "cbn", "economy", "subsidy",
        "fuel", "electricity", "nepa", "landlord", "tenant"
    ]
    
    # Risk Keywords - Topics to flag as sensitive
    SENSITIVE_KEYWORDS: List[str] = [
        "death", "died", "killed", "tragedy", "accident", "bomb",
        "terror", "kidnap", "murder", "protest", "riot", "clash"
    ]
    
    # Avoid Keywords - Topics to completely skip
    AVOID_KEYWORDS: List[str] = [
        "explicit", "nsfw", "porn", "xxx"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
