"""
Seed test data for development and testing.
Creates sample trends and content for demonstration purposes.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.database import Trend, ScoredTrend, RiskLevel
from loguru import logger


async def seed_sample_trends(db):
    """Add sample Nigerian real estate and economic trends."""
    
    sample_trends = [
        {
            "source": "google_news",
            "source_id": "test_trend_1",
            "title": "CBN Raises Interest Rates to 18.5%",
            "text": "The Central Bank of Nigeria has increased the benchmark interest rate to 18.5% in a bid to curb inflation. This move is expected to impact mortgage rates and housing affordability across major cities.",
            "url": "https://example.com/news/cbn-interest-rates",
            "author": "BusinessDay Nigeria",
            "timestamp": datetime.utcnow() - timedelta(hours=2),
            "likes": 245,
            "shares": 89,
            "comments": 34
        },
        {
            "source": "twitter",
            "source_id": "test_trend_2",
            "title": None,
            "text": "Lagos rent prices have increased by 35% in the last 12 months. The average 2-bedroom apartment in Lekki now costs ₦2.5M per year. This is unsustainable for most middle-class families.",
            "url": "https://twitter.com/example/status/123",
            "author": "NigeriaPropertyCentre",
            "timestamp": datetime.utcnow() - timedelta(hours=5),
            "likes": 892,
            "shares": 234,
            "comments": 156
        },
        {
            "source": "google_news",
            "source_id": "test_trend_3",
            "title": "Federal Government Announces New Housing Policy",
            "text": "The federal government has unveiled a new national housing policy aimed at delivering 500,000 affordable homes over the next 3 years. The policy includes subsidized mortgages and tax incentives for developers.",
            "url": "https://example.com/news/housing-policy",
            "author": "Premium Times",
            "timestamp": datetime.utcnow() - timedelta(hours=8),
            "likes": 567,
            "shares": 123,
            "comments": 78
        },
        {
            "source": "twitter",
            "source_id": "test_trend_4",
            "title": None,
            "text": "Electricity tariff hike will affect property values. Landlords in areas with poor power supply are already struggling to find tenants. This new increase will make things worse.",
            "url": "https://twitter.com/example/status/456",
            "author": "MrFixNigeria",
            "timestamp": datetime.utcnow() - timedelta(hours=12),
            "likes": 445,
            "shares": 98,
            "comments": 67
        },
        {
            "source": "google_news",
            "source_id": "test_trend_5",
            "title": "Naira Devaluation Impacts Construction Costs",
            "text": "The recent naira devaluation has led to a 40% increase in construction material costs. Developers are warning that this will push housing prices even higher, making homeownership increasingly difficult for Nigerians.",
            "url": "https://example.com/news/naira-construction",
            "author": "The Cable",
            "timestamp": datetime.utcnow() - timedelta(hours=15),
            "likes": 334,
            "shares": 76,
            "comments": 45
        },
    ]
    
    added_count = 0
    
    for trend_data in sample_trends:
        # Check if already exists
        existing = db.query(Trend).filter(
            Trend.source_id == trend_data["source_id"]
        ).first()
        
        if existing:
            logger.info(f"Trend {trend_data['source_id']} already exists, skipping")
            continue
        
        trend = Trend(**trend_data)
        db.add(trend)
        db.flush()  # Get the ID
        
        # Add scored trend
        scored_trend = ScoredTrend(
            trend_id=trend.id,
            relevance_score=85.0 if "housing" in trend.text.lower() or "rent" in trend.text.lower() else 75.0,
            risk_level=RiskLevel.SAFE,
            virality_score=60.0,
            keyword_matches=extract_keywords(trend.text),
            macro_impact_score=70.0 if "government" in trend.text.lower() or "policy" in trend.text.lower() else 50.0,
            sensitive_flags=[],
            risk_reason="No risk flags detected",
            passed_filter=True
        )
        db.add(scored_trend)
        
        added_count += 1
        logger.info(f"Added sample trend: {trend_data.get('title') or trend_data['text'][:50]}")
    
    db.commit()
    logger.info(f"Added {added_count} sample trends with scores")
    return added_count


def extract_keywords(text: str) -> list:
    """Extract relevant keywords from text."""
    keywords = []
    keyword_list = [
        "real estate", "housing", "rent", "property", "land", "mortgage",
        "naira", "inflation", "cbn", "interest rate", "policy", "government",
        "lagos", "electricity", "power", "construction"
    ]
    
    text_lower = text.lower()
    for keyword in keyword_list:
        if keyword in text_lower:
            keywords.append(keyword)
    
    return keywords


async def main():
    """Main seeding function."""
    logger.info("Starting test data seeding...")
    
    db = SessionLocal()
    
    try:
        trends_added = await seed_sample_trends(db)
        
        logger.info("=" * 60)
        logger.info("Test data seeding complete!")
        logger.info(f"  - Sample trends added: {trends_added}")
        logger.info("=" * 60)
        logger.info("\nYou can now:")
        logger.info("  1. View trends in the dashboard")
        logger.info("  2. Trigger content generation: POST /api/v1/content/generate")
        logger.info("  3. Review generated content")
        
    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
