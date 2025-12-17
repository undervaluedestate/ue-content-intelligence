"""
Trend ingestion service for collecting data from multiple sources.
Supports Twitter/X, Google News, and RSS feeds.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import tweepy
import feedparser
import httpx
from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.database import Trend, WhitelistedAccount


class TrendIngestionService:
    """Service for ingesting trends from multiple sources."""
    
    def __init__(self, db: Session):
        self.db = db
        self.twitter_client = self._init_twitter_client()
    
    def _init_twitter_client(self) -> Optional[tweepy.Client]:
        """Initialize Twitter API client if credentials are available."""
        if not settings.TWITTER_BEARER_TOKEN:
            logger.warning("Twitter API credentials not configured")
            return None
        
        try:
            client = tweepy.Client(
                bearer_token=settings.TWITTER_BEARER_TOKEN,
                consumer_key=settings.TWITTER_API_KEY,
                consumer_secret=settings.TWITTER_API_SECRET,
                access_token=settings.TWITTER_ACCESS_TOKEN,
                access_token_secret=settings.TWITTER_ACCESS_SECRET,
                wait_on_rate_limit=True
            )
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Twitter client: {e}")
            return None
    
    async def ingest_all_sources(self) -> Dict[str, int]:
        """
        Ingest trends from all enabled sources.
        Returns count of new trends per source.
        """
        results = {}
        
        if settings.ENABLE_TWITTER_INGESTION and self.twitter_client:
            results['twitter_trending'] = await self.ingest_twitter_trends()
            results['twitter_accounts'] = await self.ingest_whitelisted_twitter()
        
        if settings.ENABLE_GOOGLE_NEWS:
            results['google_news'] = await self.ingest_google_news()
        
        logger.info(f"Ingestion complete: {results}")
        return results
    
    async def ingest_twitter_trends(self) -> int:
        """
        Ingest trending topics from Twitter/X for Nigeria.
        Returns count of new trends ingested.
        """
        if not self.twitter_client:
            return 0
        
        try:
            # WOEID for Nigeria (23424908) and Lagos (1398823)
            woeids = [23424908, 1398823]
            new_count = 0
            
            for woeid in woeids:
                try:
                    # Note: Twitter API v2 doesn't have trends endpoint in free tier
                    # This is a placeholder for when using elevated access
                    # For free tier, we'll focus on whitelisted accounts
                    logger.warning(f"Twitter trends API requires elevated access. Skipping WOEID {woeid}")
                except Exception as e:
                    logger.error(f"Error fetching trends for WOEID {woeid}: {e}")
            
            return new_count
        
        except Exception as e:
            logger.error(f"Error in Twitter trends ingestion: {e}")
            return 0
    
    async def ingest_whitelisted_twitter(self) -> int:
        """
        Ingest recent tweets from whitelisted Twitter accounts.
        Returns count of new trends ingested.
        """
        if not self.twitter_client:
            return 0
        
        try:
            # Get active whitelisted accounts
            accounts = self.db.query(WhitelistedAccount).filter(
                WhitelistedAccount.platform == "twitter",
                WhitelistedAccount.active == True
            ).all()
            
            if not accounts:
                logger.info("No whitelisted Twitter accounts configured")
                return 0
            
            new_count = 0
            cutoff_time = datetime.utcnow() - timedelta(hours=settings.INGESTION_INTERVAL_HOURS)
            
            for account in accounts:
                try:
                    # Get user's recent tweets
                    tweets = self.twitter_client.get_users_tweets(
                        id=account.account_id,
                        max_results=10,
                        tweet_fields=['created_at', 'public_metrics', 'entities'],
                        start_time=cutoff_time.isoformat() + 'Z'
                    )
                    
                    if not tweets.data:
                        continue
                    
                    for tweet in tweets.data:
                        # Check if already exists
                        existing = self.db.query(Trend).filter(
                            Trend.source_id == f"twitter_{tweet.id}"
                        ).first()
                        
                        if existing:
                            continue
                        
                        # Create new trend
                        trend = Trend(
                            source="twitter",
                            source_id=f"twitter_{tweet.id}",
                            text=tweet.text,
                            url=f"https://twitter.com/{account.username}/status/{tweet.id}",
                            author=account.username,
                            timestamp=tweet.created_at,
                            likes=tweet.public_metrics.get('like_count', 0),
                            shares=tweet.public_metrics.get('retweet_count', 0),
                            comments=tweet.public_metrics.get('reply_count', 0),
                            views=tweet.public_metrics.get('impression_count', 0)
                        )
                        
                        self.db.add(trend)
                        new_count += 1
                    
                    # Update last checked time
                    account.last_checked = datetime.utcnow()
                
                except Exception as e:
                    logger.error(f"Error ingesting tweets from @{account.username}: {e}")
            
            self.db.commit()
            logger.info(f"Ingested {new_count} tweets from whitelisted accounts")
            return new_count
        
        except Exception as e:
            logger.error(f"Error in whitelisted Twitter ingestion: {e}")
            self.db.rollback()
            return 0
    
    async def ingest_google_news(self) -> int:
        """
        Ingest news from Google News RSS feeds.
        Returns count of new trends ingested.
        """
        try:
            # Google News RSS feeds for Nigerian topics
            rss_feeds = [
                "https://news.google.com/rss/search?q=Nigeria+real+estate&hl=en-NG&gl=NG&ceid=NG:en",
                "https://news.google.com/rss/search?q=Nigeria+housing&hl=en-NG&gl=NG&ceid=NG:en",
                "https://news.google.com/rss/search?q=Nigeria+inflation&hl=en-NG&gl=NG&ceid=NG:en",
                "https://news.google.com/rss/search?q=Nigeria+investment&hl=en-NG&gl=NG&ceid=NG:en",
            ]
            
            new_count = 0
            cutoff_time = datetime.utcnow() - timedelta(hours=settings.INGESTION_INTERVAL_HOURS * 2)
            
            logger.info(f"Starting Google News ingestion from {len(rss_feeds)} feeds")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for feed_url in rss_feeds:
                    try:
                        logger.debug(f"Fetching feed: {feed_url}")
                        response = await client.get(feed_url, follow_redirects=True)
                        response.raise_for_status()
                        
                        logger.debug(f"Parsing feed response ({len(response.text)} bytes)")
                        feed = feedparser.parse(response.text)
                        
                        if not feed.entries:
                            logger.warning(f"No entries found in feed: {feed_url}")
                            continue
                        
                        logger.info(f"Found {len(feed.entries)} entries in feed")
                        
                        for entry in feed.entries[:10]:  # Limit to 10 per feed
                            # Parse published date
                            published = datetime(*entry.published_parsed[:6]) if hasattr(entry, 'published_parsed') else datetime.utcnow()
                            
                            if published < cutoff_time:
                                continue
                            
                            # Check if already exists
                            source_id = f"google_news_{entry.get('id', entry.link)}"
                            existing = self.db.query(Trend).filter(
                                Trend.source_id == source_id
                            ).first()
                            
                            if existing:
                                continue
                            
                            # Create new trend
                            trend = Trend(
                                source="google_news",
                                source_id=source_id,
                                title=entry.title,
                                text=entry.get('summary', entry.title),
                                url=entry.link,
                                author=entry.get('source', {}).get('title', 'Unknown'),
                                timestamp=published
                            )
                            
                            self.db.add(trend)
                            new_count += 1
                    
                    except Exception as e:
                        logger.error(f"Error parsing feed {feed_url}: {e}")
            
            self.db.commit()
            logger.info(f"Ingested {new_count} news items from Google News")
            return new_count
        
        except Exception as e:
            logger.error(f"Error in Google News ingestion: {e}")
            self.db.rollback()
            return 0
    
    async def add_whitelisted_account(
        self, 
        platform: str, 
        username: str, 
        category: str = "general",
        priority: int = 1
    ) -> WhitelistedAccount:
        """Add a new whitelisted account to monitor."""
        
        # For Twitter, fetch account ID
        account_id = None
        display_name = username
        
        if platform == "twitter" and self.twitter_client:
            try:
                user = self.twitter_client.get_user(username=username)
                if user.data:
                    account_id = user.data.id
                    display_name = user.data.name
            except Exception as e:
                logger.error(f"Error fetching Twitter user {username}: {e}")
        
        account = WhitelistedAccount(
            platform=platform,
            username=username,
            account_id=account_id,
            display_name=display_name,
            category=category,
            priority=priority
        )
        
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        
        logger.info(f"Added whitelisted account: {platform}/@{username}")
        return account
