"""
Health check script for monitoring system status.
Verifies database, API, and service connectivity.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.core.config import settings
from app.models.database import Trend, ContentDraft
from loguru import logger


async def check_database():
    """Check database connectivity and basic queries."""
    try:
        db = SessionLocal()
        
        # Test query
        trend_count = db.query(Trend).count()
        content_count = db.query(ContentDraft).count()
        
        db.close()
        
        logger.info(f"✓ Database: Connected (Trends: {trend_count}, Content: {content_count})")
        return True
    except Exception as e:
        logger.error(f"✗ Database: Failed - {e}")
        return False


async def check_openai():
    """Check OpenAI API connectivity."""
    if not settings.OPENAI_API_KEY:
        logger.warning("⚠ OpenAI: API key not configured")
        return False
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Test with a minimal request
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        
        logger.info("✓ OpenAI: Connected")
        return True
    except Exception as e:
        logger.error(f"✗ OpenAI: Failed - {e}")
        return False


async def check_twitter():
    """Check Twitter API connectivity."""
    if not settings.TWITTER_BEARER_TOKEN:
        logger.warning("⚠ Twitter: API credentials not configured")
        return False
    
    try:
        import tweepy
        client = tweepy.Client(bearer_token=settings.TWITTER_BEARER_TOKEN)
        
        # Test with a simple request
        user = client.get_user(username="twitter")
        
        logger.info("✓ Twitter: Connected")
        return True
    except Exception as e:
        logger.error(f"✗ Twitter: Failed - {e}")
        return False


async def check_email():
    """Check email service connectivity."""
    # Check Gmail API
    if settings.USE_GMAIL_API:
        try:
            from pathlib import Path
            credentials_path = Path(settings.GMAIL_CREDENTIALS_PATH)
            token_path = Path(settings.GMAIL_TOKEN_PATH)
            
            if not credentials_path.exists():
                logger.warning(f"⚠ Gmail: Credentials file not found at {credentials_path}")
                return False
            
            if not token_path.exists():
                logger.warning(f"⚠ Gmail: Token file not found at {token_path}. Run authentication first.")
                return False
            
            logger.info("✓ Gmail: Credentials and token configured")
            return True
        except Exception as e:
            logger.error(f"✗ Gmail: Failed - {e}")
            return False
    
    # Check Resend (legacy)
    elif settings.RESEND_API_KEY:
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            logger.info("✓ Resend: API key configured")
            return True
        except Exception as e:
            logger.error(f"✗ Resend: Failed - {e}")
            return False
    
    else:
        logger.warning("⚠ Email: No email service configured")
        return False


async def main():
    """Run all health checks."""
    logger.info("=" * 60)
    logger.info("Content Intelligence System - Health Check")
    logger.info("=" * 60)
    
    results = {}
    
    # Run checks
    results['database'] = await check_database()
    results['openai'] = await check_openai()
    results['twitter'] = await check_twitter()
    results['email'] = await check_email()
    
    # Summary
    logger.info("=" * 60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    if passed == total:
        logger.info(f"✓ All checks passed ({passed}/{total})")
        logger.info("System is healthy and ready to use!")
    else:
        logger.warning(f"⚠ {passed}/{total} checks passed")
        logger.warning("Some services are not configured or unavailable")
    
    logger.info("=" * 60)
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
