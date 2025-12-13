"""
Database models for the Content Intelligence System.
All tables needed for trend ingestion, scoring, content generation, and approval workflow.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, 
    JSON, Enum as SQLEnum, ForeignKey, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class RiskLevel(str, enum.Enum):
    """Risk classification for trends."""
    SAFE = "safe"
    SENSITIVE = "sensitive"
    AVOID = "avoid"


class ContentStatus(str, enum.Enum):
    """Status of generated content."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"


class Platform(str, enum.Enum):
    """Social media platforms."""
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"


class ContentAngle(str, enum.Enum):
    """Content angle types."""
    EXPLAINER = "explainer"
    INVESTOR = "investor"
    PROPERTY = "property"
    CONTRARIAN = "contrarian"
    DATA_BACKED = "data_backed"


class Trend(Base):
    """Raw ingested trends from various sources."""
    __tablename__ = "trends"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)  # twitter, google_news, rss
    source_id = Column(String(255), unique=True, index=True)  # External ID
    
    # Content
    title = Column(String(500))
    text = Column(Text, nullable=False)
    url = Column(String(1000))
    
    # Metadata
    author = Column(String(255))
    timestamp = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Engagement metrics
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    views = Column(Integer, default=0)
    
    # Processing status
    processed = Column(Boolean, default=False, index=True)
    
    # Relationships
    scored_trend = relationship("ScoredTrend", back_populates="trend", uselist=False)
    
    __table_args__ = (
        Index('idx_trends_source_timestamp', 'source', 'timestamp'),
        Index('idx_trends_processed', 'processed', 'ingested_at'),
    )


class ScoredTrend(Base):
    """Trends that have been scored for relevance and risk."""
    __tablename__ = "scored_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    trend_id = Column(Integer, ForeignKey("trends.id"), unique=True, nullable=False)
    
    # Scoring
    relevance_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(SQLEnum(RiskLevel), nullable=False)
    virality_score = Column(Float, default=0)  # Based on engagement velocity
    
    # Scoring breakdown
    keyword_matches = Column(JSON)  # List of matched keywords
    macro_impact_score = Column(Float, default=0)  # Economic/housing impact
    
    # Risk analysis
    sensitive_flags = Column(JSON)  # List of sensitive keywords found
    risk_reason = Column(Text)  # Why it was flagged
    
    # Processing
    scored_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    passed_filter = Column(Boolean, default=False, index=True)  # relevance >= threshold AND risk != avoid
    
    # Relationships
    trend = relationship("Trend", back_populates="scored_trend")
    content_drafts = relationship("ContentDraft", back_populates="scored_trend")
    
    __table_args__ = (
        Index('idx_scored_trends_filter', 'passed_filter', 'relevance_score'),
    )


class ContentDraft(Base):
    """Generated content drafts for approved trends."""
    __tablename__ = "content_drafts"
    
    id = Column(Integer, primary_key=True, index=True)
    scored_trend_id = Column(Integer, ForeignKey("scored_trends.id"), nullable=False)
    
    # Content details
    platform = Column(SQLEnum(Platform), nullable=False)
    angle = Column(SQLEnum(ContentAngle), nullable=False)
    
    # Generated content
    content = Column(Text, nullable=False)  # Main post text
    hook = Column(String(500))  # For Twitter/Instagram
    thread = Column(JSON)  # For Twitter threads (list of tweets)
    carousel_slides = Column(JSON)  # For Instagram (list of slide content)
    
    # Metadata
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ai_model = Column(String(50))  # Which AI model was used
    
    # Status
    status = Column(SQLEnum(ContentStatus), default=ContentStatus.PENDING, index=True)
    
    # Human edits
    edited_content = Column(Text)  # If user edited the draft
    edited_at = Column(DateTime)
    edited_by = Column(String(255))  # User email/ID
    
    # Approval
    approved_by = Column(String(255))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Scheduling
    scheduled_for = Column(DateTime)
    published_at = Column(DateTime)
    external_post_id = Column(String(255))  # ID from social platform
    
    # Relationships
    scored_trend = relationship("ScoredTrend", back_populates="content_drafts")
    
    __table_args__ = (
        Index('idx_content_drafts_status', 'status', 'generated_at'),
        Index('idx_content_drafts_platform', 'platform', 'status'),
    )


class Configuration(Base):
    """System configuration and admin settings."""
    __tablename__ = "configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    description = Column(Text)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255))


class AuditLog(Base):
    """Audit trail for all important actions."""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)  # trend_rejected, content_approved, etc.
    entity_type = Column(String(50), nullable=False)  # trend, content_draft, config
    entity_id = Column(Integer, nullable=False)
    
    # Actor
    user_email = Column(String(255))
    user_agent = Column(String(500))
    ip_address = Column(String(50))
    
    # Details
    details = Column(JSON)  # Additional context
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_audit_logs_action_time', 'action', 'created_at'),
        Index('idx_audit_logs_entity', 'entity_type', 'entity_id'),
    )


class WhitelistedAccount(Base):
    """Twitter/X accounts to monitor for trends."""
    __tablename__ = "whitelisted_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(50), nullable=False)  # twitter, linkedin, etc.
    username = Column(String(255), nullable=False)
    account_id = Column(String(255))  # Platform-specific ID
    
    # Metadata
    display_name = Column(String(255))
    category = Column(String(100))  # economist, journalist, analyst, etc.
    priority = Column(Integer, default=1)  # Higher = more important
    
    # Status
    active = Column(Boolean, default=True, index=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime)
    
    __table_args__ = (
        Index('idx_whitelisted_platform_username', 'platform', 'username'),
    )
