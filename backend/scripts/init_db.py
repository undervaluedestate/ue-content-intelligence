"""
Database initialization script.
Creates tables and seeds initial data including Nigerian whitelisted accounts.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import init_db, SessionLocal
from app.models.database import WhitelistedAccount, Configuration
from loguru import logger


async def seed_whitelisted_accounts(db):
    """Add curated Nigerian accounts for monitoring."""
    
    accounts = [
        # Real Estate & Property
        {
            "platform": "twitter",
            "username": "NigeriaPropertyCentre",
            "display_name": "Nigeria Property Centre",
            "category": "real_estate",
            "priority": 3
        },
        {
            "platform": "twitter",
            "username": "PropertyProNG",
            "display_name": "PropertyPro Nigeria",
            "category": "real_estate",
            "priority": 3
        },
        
        # Economics & Policy
        {
            "platform": "twitter",
            "username": "BudgITng",
            "display_name": "BudgIT Nigeria",
            "category": "policy",
            "priority": 2
        },
        {
            "platform": "twitter",
            "username": "cenbank",
            "display_name": "Central Bank of Nigeria",
            "category": "policy",
            "priority": 1
        },
        {
            "platform": "twitter",
            "username": "NigerianStat",
            "display_name": "National Bureau of Statistics",
            "category": "data",
            "priority": 2
        },
        
        # News & Media
        {
            "platform": "twitter",
            "username": "PremiumTimesng",
            "display_name": "Premium Times",
            "category": "news",
            "priority": 2
        },
        {
            "platform": "twitter",
            "username": "thecableng",
            "display_name": "The Cable",
            "category": "news",
            "priority": 2
        },
        {
            "platform": "twitter",
            "username": "channelstv",
            "display_name": "Channels Television",
            "category": "news",
            "priority": 2
        },
        
        # Analysts & Commentators
        {
            "platform": "twitter",
            "username": "MrFixNigeria",
            "display_name": "Mr Fix Nigeria",
            "category": "analyst",
            "priority": 2
        },
        {
            "platform": "twitter",
            "username": "DoubleEph",
            "display_name": "Ephraim Nwoke",
            "category": "analyst",
            "priority": 2
        },
        
        # Business & Investment
        {
            "platform": "twitter",
            "username": "nairametrics",
            "display_name": "Nairametrics",
            "category": "business",
            "priority": 2
        },
        {
            "platform": "twitter",
            "username": "BusinessDayNG",
            "display_name": "BusinessDay Nigeria",
            "category": "business",
            "priority": 2
        },
    ]
    
    added_count = 0
    
    for account_data in accounts:
        # Check if already exists
        existing = db.query(WhitelistedAccount).filter(
            WhitelistedAccount.platform == account_data["platform"],
            WhitelistedAccount.username == account_data["username"]
        ).first()
        
        if existing:
            logger.info(f"Account @{account_data['username']} already exists, skipping")
            continue
        
        account = WhitelistedAccount(**account_data)
        db.add(account)
        added_count += 1
        logger.info(f"Added whitelisted account: @{account_data['username']} ({account_data['category']})")
    
    db.commit()
    logger.info(f"Added {added_count} new whitelisted accounts")
    return added_count


async def seed_default_config(db):
    """Add default configuration values."""
    
    configs = [
        {
            "key": "platforms_enabled",
            "value": ["twitter", "linkedin", "instagram", "facebook"],
            "description": "Platforms to generate content for"
        },
        {
            "key": "tone",
            "value": "balanced",
            "description": "Content tone: conservative, balanced, or bold"
        },
        {
            "key": "auto_approve_threshold",
            "value": 95,
            "description": "Relevance score threshold for auto-approval (disabled if 100)"
        },
        {
            "key": "max_content_per_trend",
            "value": 8,
            "description": "Maximum content pieces to generate per trend (platforms × angles)"
        },
    ]
    
    added_count = 0
    
    for config_data in configs:
        existing = db.query(Configuration).filter(
            Configuration.key == config_data["key"]
        ).first()
        
        if existing:
            logger.info(f"Config '{config_data['key']}' already exists, skipping")
            continue
        
        config = Configuration(**config_data)
        db.add(config)
        added_count += 1
        logger.info(f"Added config: {config_data['key']}")
    
    db.commit()
    logger.info(f"Added {added_count} new configuration values")
    return added_count


async def main():
    """Main initialization function."""
    logger.info("Starting database initialization...")
    
    # Create tables
    logger.info("Creating database tables...")
    init_db()
    logger.info("Database tables created successfully")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Seed whitelisted accounts
        logger.info("Seeding whitelisted accounts...")
        accounts_added = await seed_whitelisted_accounts(db)
        
        # Seed default configuration
        logger.info("Seeding default configuration...")
        configs_added = await seed_default_config(db)
        
        logger.info("=" * 60)
        logger.info("Database initialization complete!")
        logger.info(f"  - Whitelisted accounts added: {accounts_added}")
        logger.info(f"  - Configuration values added: {configs_added}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
