"""
Background workers for scheduled tasks.
Handles periodic trend ingestion, scoring, and content generation.
"""

from datetime import datetime
from loguru import logger
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.ingestion.trend_ingestion import TrendIngestionService
from app.services.scoring.relevance_scorer import RelevanceScoringService
from app.services.generation.content_generator import ContentGenerationService


def get_db_session() -> Session:
    """Get a database session for background jobs."""
    return SessionLocal()


async def run_ingestion_pipeline():
    """
    Complete ingestion pipeline: ingest -> score -> generate.
    This should run every 2-3 hours.
    """
    logger.info("Starting ingestion pipeline...")
    db = get_db_session()
    
    try:
        # Step 1: Ingest trends
        logger.info("Step 1: Ingesting trends...")
        ingestion_service = TrendIngestionService(db)
        ingestion_results = await ingestion_service.ingest_all_sources()
        logger.info(f"Ingestion complete: {ingestion_results}")
        
        # Step 2: Score trends
        logger.info("Step 2: Scoring trends...")
        scoring_service = RelevanceScoringService(db)
        scored_count = await scoring_service.score_unprocessed_trends()
        logger.info(f"Scored {scored_count} trends")
        
        # Step 3: Generate content
        logger.info("Step 3: Generating content...")
        generation_service = ContentGenerationService(db)
        generated_count = await generation_service.generate_content_for_top_trends(limit=5)
        logger.info(f"Generated {generated_count} content pieces")
        
        logger.info("Ingestion pipeline complete!")
        
        return {
            'status': 'success',
            'ingestion': ingestion_results,
            'scored': scored_count,
            'generated': generated_count,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in ingestion pipeline: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    finally:
        db.close()


async def send_daily_digest():
    """
    Send daily email digest with pending content for review.
    This should run once daily at configured time.
    """
    logger.info("Preparing daily digest...")
    db = get_db_session()
    
    try:
        from app.models.database import ContentDraft, ContentStatus
        from app.services.email.digest_service import EmailDigestService
        
        # Get pending content
        pending_content = db.query(ContentDraft).filter(
            ContentDraft.status == ContentStatus.PENDING
        ).order_by(ContentDraft.generated_at.desc()).limit(20).all()
        
        if not pending_content:
            logger.info("No pending content for digest")
            return {'status': 'skipped', 'reason': 'no_pending_content'}
        
        # Send digest
        email_service = EmailDigestService(db)
        result = await email_service.send_digest(pending_content)
        
        logger.info(f"Daily digest sent: {result}")
        return result
    
    except Exception as e:
        logger.error(f"Error sending daily digest: {e}")
        return {'status': 'error', 'error': str(e)}
    
    finally:
        db.close()


# Standalone functions for cron jobs or task queue
def ingestion_job():
    """Synchronous wrapper for ingestion pipeline (for cron/RQ)."""
    import asyncio
    return asyncio.run(run_ingestion_pipeline())


def digest_job():
    """Synchronous wrapper for daily digest (for cron/RQ)."""
    import asyncio
    return asyncio.run(send_daily_digest())
