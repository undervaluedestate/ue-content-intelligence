"""
API routes for the Content Intelligence System.
Provides endpoints for trends, content, approvals, and configuration.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.database import (
    Trend, ScoredTrend, ContentDraft, Configuration,
    ContentStatus, Platform, ContentAngle, RiskLevel, AuditLog
)
from app.services.ingestion.trend_ingestion import TrendIngestionService
from app.services.scoring.relevance_scorer import RelevanceScoringService
from app.services.generation.content_generator import ContentGenerationService
from app.services.email.digest_service import EmailDigestService

router = APIRouter()


# ============================================================================
# Pydantic Schemas for Request/Response
# ============================================================================

class TrendResponse(BaseModel):
    id: int
    source: str
    title: Optional[str]
    text: str
    url: Optional[str]
    author: Optional[str]
    timestamp: datetime
    likes: int
    shares: int
    relevance_score: Optional[float]
    risk_level: Optional[str]
    keyword_matches: Optional[List[str]]
    
    class Config:
        from_attributes = True


class ContentDraftResponse(BaseModel):
    id: int
    platform: str
    angle: str
    content: str
    hook: Optional[str]
    thread: Optional[List[str]]
    carousel_slides: Optional[List[str]]
    status: str
    generated_at: datetime
    trend_info: Optional[TrendResponse]
    
    class Config:
        from_attributes = True


class ApprovalRequest(BaseModel):
    content_id: int
    action: str = Field(..., pattern="^(approve|reject|edit)$")
    edited_content: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_by: str


class ScheduleRequest(BaseModel):
    content_id: int
    scheduled_for: Optional[datetime] = None
    export_to: Optional[str] = None  # buffer, publer, meta, copy


class ConfigUpdateRequest(BaseModel):
    key: str
    value: dict
    updated_by: str


# ============================================================================
# Trends Endpoints
# ============================================================================

@router.get("/trends", response_model=List[TrendResponse])
async def get_trends(
    limit: int = Query(20, le=100),
    min_relevance: int = Query(0, ge=0, le=100),
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get filtered trends with scores."""
    query = db.query(Trend).join(ScoredTrend).filter(
        ScoredTrend.passed_filter == True
    )
    
    if min_relevance > 0:
        query = query.filter(ScoredTrend.relevance_score >= min_relevance)
    
    if risk_level:
        query = query.filter(ScoredTrend.risk_level == risk_level)
    
    trends = query.order_by(ScoredTrend.relevance_score.desc()).limit(limit).all()
    
    # Build response with scores
    result = []
    for trend in trends:
        scored = trend.scored_trend
        result.append({
            'id': trend.id,
            'source': trend.source,
            'title': trend.title,
            'text': trend.text,
            'url': trend.url,
            'author': trend.author,
            'timestamp': trend.timestamp,
            'likes': trend.likes,
            'shares': trend.shares,
            'relevance_score': scored.relevance_score if scored else None,
            'risk_level': scored.risk_level.value if scored else None,
            'keyword_matches': scored.keyword_matches if scored else None
        })
    
    return result


@router.post("/trends/ingest")
async def trigger_ingestion(db: Session = Depends(get_db)):
    """Manually trigger trend ingestion from all sources."""
    service = TrendIngestionService(db)
    results = await service.ingest_all_sources()
    return {"status": "success", "results": results}


@router.post("/trends/score")
async def trigger_scoring(db: Session = Depends(get_db)):
    """Manually trigger scoring of unprocessed trends."""
    service = RelevanceScoringService(db)
    count = await service.score_unprocessed_trends()
    return {"status": "success", "scored_count": count}


# ============================================================================
# Content Endpoints
# ============================================================================

@router.get("/content", response_model=List[ContentDraftResponse])
async def get_content_drafts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Get content drafts with optional filters."""
    query = db.query(ContentDraft)
    
    if status:
        query = query.filter(ContentDraft.status == status)
    
    if platform:
        query = query.filter(ContentDraft.platform == platform)
    
    drafts = query.order_by(ContentDraft.generated_at.desc()).limit(limit).all()
    
    # Build response with trend info
    result = []
    for draft in drafts:
        trend = draft.scored_trend.trend if draft.scored_trend else None
        trend_info = None
        
        if trend:
            scored = trend.scored_trend
            trend_info = {
                'id': trend.id,
                'source': trend.source,
                'title': trend.title,
                'text': trend.text,
                'url': trend.url,
                'author': trend.author,
                'timestamp': trend.timestamp,
                'likes': trend.likes,
                'shares': trend.shares,
                'relevance_score': scored.relevance_score if scored else None,
                'risk_level': scored.risk_level.value if scored else None,
                'keyword_matches': scored.keyword_matches if scored else None
            }
        
        result.append({
            'id': draft.id,
            'platform': draft.platform.value,
            'angle': draft.angle.value,
            'content': draft.edited_content or draft.content,
            'hook': draft.hook,
            'thread': draft.thread,
            'carousel_slides': draft.carousel_slides,
            'status': draft.status.value,
            'generated_at': draft.generated_at,
            'trend_info': trend_info
        })
    
    return result


@router.post("/content/generate")
async def trigger_content_generation(
    limit: int = Query(5, le=20),
    db: Session = Depends(get_db)
):
    """Manually trigger content generation for top trends."""
    service = ContentGenerationService(db)
    count = await service.generate_content_for_top_trends(limit)
    return {"status": "success", "generated_count": count}


@router.get("/content/{content_id}")
async def get_content_draft(content_id: int, db: Session = Depends(get_db)):
    """Get a single content draft by ID."""
    draft = db.query(ContentDraft).filter(ContentDraft.id == content_id).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Content draft not found")
    
    trend = draft.scored_trend.trend if draft.scored_trend else None
    
    return {
        'id': draft.id,
        'platform': draft.platform.value,
        'angle': draft.angle.value,
        'content': draft.edited_content or draft.content,
        'hook': draft.hook,
        'thread': draft.thread,
        'carousel_slides': draft.carousel_slides,
        'status': draft.status.value,
        'generated_at': draft.generated_at,
        'trend': {
            'id': trend.id,
            'title': trend.title,
            'text': trend.text,
            'url': trend.url,
            'source': trend.source
        } if trend else None
    }


# ============================================================================
# Approval Endpoints
# ============================================================================

@router.post("/content/approve")
async def approve_content(request: ApprovalRequest, db: Session = Depends(get_db)):
    """Approve, reject, or edit content draft."""
    draft = db.query(ContentDraft).filter(ContentDraft.id == request.content_id).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Content draft not found")
    
    if request.action == "approve":
        draft.status = ContentStatus.APPROVED
        draft.approved_by = request.approved_by
        draft.approved_at = datetime.utcnow()
        
        # If edited content provided, save it
        if request.edited_content:
            draft.edited_content = request.edited_content
            draft.edited_at = datetime.utcnow()
            draft.edited_by = request.approved_by
        
        # Log approval
        log = AuditLog(
            action="content_approved",
            entity_type="content_draft",
            entity_id=draft.id,
            user_email=request.approved_by,
            details={
                'platform': draft.platform.value,
                'angle': draft.angle.value,
                'was_edited': request.edited_content is not None
            }
        )
        db.add(log)
    
    elif request.action == "reject":
        draft.status = ContentStatus.REJECTED
        draft.rejection_reason = request.rejection_reason
        
        # Log rejection
        log = AuditLog(
            action="content_rejected",
            entity_type="content_draft",
            entity_id=draft.id,
            user_email=request.approved_by,
            details={
                'platform': draft.platform.value,
                'reason': request.rejection_reason
            }
        )
        db.add(log)
    
    elif request.action == "edit":
        if not request.edited_content:
            raise HTTPException(status_code=400, detail="edited_content required for edit action")
        
        draft.edited_content = request.edited_content
        draft.edited_at = datetime.utcnow()
        draft.edited_by = request.approved_by
    
    db.commit()
    
    return {"status": "success", "content_id": draft.id, "new_status": draft.status.value}


@router.post("/content/schedule")
async def schedule_content(request: ScheduleRequest, db: Session = Depends(get_db)):
    """Schedule or export approved content."""
    draft = db.query(ContentDraft).filter(ContentDraft.id == request.content_id).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Content draft not found")
    
    if draft.status != ContentStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Content must be approved before scheduling")
    
    if request.scheduled_for:
        draft.scheduled_for = request.scheduled_for
        draft.status = ContentStatus.SCHEDULED
    
    db.commit()
    
    # Return formatted content for export
    export_data = {
        'platform': draft.platform.value,
        'content': draft.edited_content or draft.content,
        'hook': draft.hook,
        'thread': draft.thread,
        'carousel_slides': draft.carousel_slides,
        'scheduled_for': draft.scheduled_for.isoformat() if draft.scheduled_for else None
    }
    
    return {"status": "success", "export_data": export_data}


# ============================================================================
# Configuration Endpoints
# ============================================================================

@router.get("/config")
async def get_all_config(db: Session = Depends(get_db)):
    """Get all configuration settings."""
    configs = db.query(Configuration).all()
    return {config.key: config.value for config in configs}


@router.get("/config/{key}")
async def get_config(key: str, db: Session = Depends(get_db)):
    """Get a specific configuration value."""
    config = db.query(Configuration).filter(Configuration.key == key).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return {"key": config.key, "value": config.value, "description": config.description}


@router.post("/config")
async def update_config(request: ConfigUpdateRequest, db: Session = Depends(get_db)):
    """Update or create a configuration setting."""
    config = db.query(Configuration).filter(Configuration.key == request.key).first()
    
    if config:
        config.value = request.value
        config.updated_by = request.updated_by
        config.updated_at = datetime.utcnow()
    else:
        config = Configuration(
            key=request.key,
            value=request.value,
            updated_by=request.updated_by
        )
        db.add(config)
    
    db.commit()
    
    # Log configuration change
    log = AuditLog(
        action="config_updated",
        entity_type="configuration",
        entity_id=config.id,
        user_email=request.updated_by,
        details={'key': request.key, 'value': request.value}
    )
    db.add(log)
    db.commit()
    
    return {"status": "success", "key": config.key}


# ============================================================================
# Stats & Dashboard Endpoints
# ============================================================================

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get system statistics for dashboard."""
    
    # Count trends
    total_trends = db.query(Trend).count()
    processed_trends = db.query(Trend).filter(Trend.processed == True).count()
    
    # Count scored trends
    passed_filter = db.query(ScoredTrend).filter(ScoredTrend.passed_filter == True).count()
    
    # Count content by status
    pending_content = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.PENDING).count()
    approved_content = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.APPROVED).count()
    rejected_content = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.REJECTED).count()
    scheduled_content = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.SCHEDULED).count()
    
    return {
        'trends': {
            'total': total_trends,
            'processed': processed_trends,
            'passed_filter': passed_filter
        },
        'content': {
            'pending': pending_content,
            'approved': approved_content,
            'rejected': rejected_content,
            'scheduled': scheduled_content
        }
    }


@router.post("/digest/send")
async def send_digest(db: Session = Depends(get_db)):
    """Manually trigger sending of email digest with pending content."""
    # Get pending content drafts
    pending_drafts = db.query(ContentDraft).filter(
        ContentDraft.status == ContentStatus.PENDING
    ).all()
    
    if not pending_drafts:
        return {
            "status": "skipped",
            "reason": "no_pending_content",
            "message": "No pending content to send in digest"
        }
    
    # Send digest
    digest_service = EmailDigestService(db)
    result = await digest_service.send_digest(pending_drafts)
    
    return result


@router.get("/trends/all")
async def get_all_trends(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """Get all trends with scores (including those that didn't pass filter) for debugging."""
    trends = db.query(Trend).outerjoin(ScoredTrend).order_by(Trend.id.desc()).limit(limit).all()
    
    result = []
    for trend in trends:
        scored = trend.scored_trend if hasattr(trend, 'scored_trend') else None
        result.append({
            'id': trend.id,
            'source': trend.source,
            'title': trend.title,
            'text': trend.text[:200] + '...' if len(trend.text) > 200 else trend.text,
            'url': trend.url,
            'timestamp': trend.timestamp,
            'processed': trend.processed,
            'relevance_score': scored.relevance_score if scored else None,
            'passed_filter': scored.passed_filter if scored else None,
            'risk_level': scored.risk_level.value if scored else None,
            'keyword_matches': scored.keyword_matches if scored else None
        })
    
    return result


@router.get("/debug/config")
async def debug_config():
    """Debug endpoint to check configuration (masked sensitive values)."""
    return {
        "google_api_key_set": bool(settings.GOOGLE_API_KEY),
        "google_api_key_length": len(settings.GOOGLE_API_KEY) if settings.GOOGLE_API_KEY else 0,
        "openai_api_key_set": bool(settings.OPENAI_API_KEY),
        "relevance_threshold": settings.RELEVANCE_THRESHOLD,
        "keyword_count": len(settings.NIGERIAN_KEYWORDS),
        "enable_google_news": settings.ENABLE_GOOGLE_NEWS,
        "database_url": settings.DATABASE_URL[:20] + "..." if settings.DATABASE_URL else None
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
