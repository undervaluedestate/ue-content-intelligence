"""
Relevance and risk scoring service.
Evaluates trends for relevance to real estate/economics and risk classification.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from loguru import logger
import re

from app.core.config import settings
from app.models.database import Trend, ScoredTrend, RiskLevel


class RelevanceScoringService:
    """Service for scoring trends on relevance and risk."""
    
    def __init__(self, db: Session):
        self.db = db
        self.nigerian_keywords = settings.NIGERIAN_KEYWORDS
        self.sensitive_keywords = settings.SENSITIVE_KEYWORDS
        self.avoid_keywords = settings.AVOID_KEYWORDS
    
    async def score_unprocessed_trends(self) -> int:
        """
        Score all unprocessed trends.
        Returns count of trends scored.
        """
        # Get unprocessed trends
        trends = self.db.query(Trend).filter(
            Trend.processed == False
        ).limit(settings.MAX_TRENDS_PER_CYCLE).all()
        
        if not trends:
            logger.info("No unprocessed trends to score")
            return 0
        
        scored_count = 0
        
        for trend in trends:
            try:
                scored_trend = await self.score_trend(trend)
                trend.processed = True
                scored_count += 1
            except Exception as e:
                logger.error(f"Error scoring trend {trend.id}: {e}")
        
        self.db.commit()
        logger.info(f"Scored {scored_count} trends")
        return scored_count
    
    async def score_trend(self, trend: Trend) -> ScoredTrend:
        """
        Score a single trend for relevance and risk.
        Returns ScoredTrend object.
        """
        # Combine title and text for analysis
        full_text = f"{trend.title or ''} {trend.text}".lower()
        
        # Calculate relevance score
        relevance_score, keyword_matches = self._calculate_relevance(full_text)
        
        # Calculate virality score
        virality_score = self._calculate_virality(trend)
        
        # Calculate macro impact score
        macro_impact_score = self._calculate_macro_impact(full_text, keyword_matches)
        
        # Classify risk
        risk_level, sensitive_flags, risk_reason = self._classify_risk(full_text)
        
        # Determine if trend passes filter
        passed_filter = (
            relevance_score >= settings.RELEVANCE_THRESHOLD and
            risk_level != RiskLevel.AVOID
        )
        
        # Create scored trend
        scored_trend = ScoredTrend(
            trend_id=trend.id,
            relevance_score=relevance_score,
            risk_level=risk_level,
            virality_score=virality_score,
            keyword_matches=keyword_matches,
            macro_impact_score=macro_impact_score,
            sensitive_flags=sensitive_flags,
            risk_reason=risk_reason,
            passed_filter=passed_filter
        )
        
        self.db.add(scored_trend)
        
        logger.info(
            f"Scored trend {trend.id}: relevance={relevance_score:.1f}, "
            f"risk={risk_level.value}, passed={passed_filter}"
        )
        
        return scored_trend
    
    def _calculate_relevance(self, text: str) -> Tuple[float, List[str]]:
        """
        Calculate relevance score based on keyword matching.
        Returns (score, matched_keywords).
        """
        matched_keywords = []
        
        # Check for keyword matches
        for keyword in self.nigerian_keywords:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                matched_keywords.append(keyword)
        
        if not matched_keywords:
            return 0.0, []
        
        # Base score from keyword count (more generous)
        base_score = min(len(matched_keywords) * 10, 60)
        
        # Bonus for high-priority real estate keywords
        priority_keywords = [
            'real estate', 'housing', 'property', 'land', 'mortgage', 'rent',
            'developer', 'construction', 'residential', 'commercial', 'apartment'
        ]
        priority_matches = [kw for kw in matched_keywords if kw in priority_keywords]
        priority_bonus = len(priority_matches) * 15
        
        # Bonus for multiple keyword categories
        categories = {
            'property': ['real estate', 'housing', 'rent', 'property', 'land', 'mortgage', 'landlord', 'tenant'],
            'economy': ['inflation', 'naira', 'economy', 'cbn', 'subsidy', 'fuel'],
            'utilities': ['power', 'gas', 'electricity', 'nepa'],
            'location': ['lagos', 'abuja', 'nigeria']
        }
        
        categories_hit = 0
        for category, keywords in categories.items():
            if any(kw in matched_keywords for kw in keywords):
                categories_hit += 1
        
        category_bonus = categories_hit * 5
        
        # Calculate final score (max 100)
        final_score = min(base_score + priority_bonus + category_bonus, 100)
        
        return final_score, matched_keywords
    
    def _calculate_virality(self, trend: Trend) -> float:
        """
        Calculate virality score based on engagement metrics.
        Returns score 0-100.
        """
        # Calculate engagement rate
        total_engagement = trend.likes + trend.shares + trend.comments
        
        if total_engagement == 0:
            return 0.0
        
        # Time-based decay (newer = higher score)
        age_hours = (datetime.utcnow() - trend.timestamp).total_seconds() / 3600
        time_factor = max(0, 1 - (age_hours / 24))  # Decay over 24 hours
        
        # Engagement velocity (engagement per hour)
        velocity = total_engagement / max(age_hours, 1)
        
        # Normalize to 0-100 scale
        # Assume 100+ engagements/hour is viral
        virality_score = min((velocity / 100) * 100, 100) * time_factor
        
        return virality_score
    
    def _calculate_macro_impact(self, text: str, keyword_matches: List[str]) -> float:
        """
        Calculate macro economic/housing impact score.
        Returns score 0-100.
        """
        # High-impact indicators
        high_impact_terms = [
            'policy', 'government', 'cbn', 'central bank', 'regulation',
            'subsidy', 'interest rate', 'mortgage rate', 'housing crisis',
            'rent control', 'land reform', 'tax', 'budget'
        ]
        
        impact_score = 0.0
        
        for term in high_impact_terms:
            if term in text:
                impact_score += 20
        
        # Bonus if combines property + policy
        has_property = any(kw in keyword_matches for kw in ['real estate', 'housing', 'rent', 'property', 'land'])
        has_policy = any(term in text for term in ['policy', 'government', 'regulation', 'law'])
        
        if has_property and has_policy:
            impact_score += 30
        
        return min(impact_score, 100)
    
    def _classify_risk(self, text: str) -> Tuple[RiskLevel, List[str], str]:
        """
        Classify risk level of the trend.
        Returns (risk_level, sensitive_flags, reason).
        """
        sensitive_flags = []
        
        # Check for avoid keywords (immediate disqualification)
        for keyword in self.avoid_keywords:
            if keyword in text:
                return (
                    RiskLevel.AVOID,
                    [keyword],
                    f"Contains prohibited keyword: {keyword}"
                )
        
        # Check for sensitive keywords
        for keyword in self.sensitive_keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                sensitive_flags.append(keyword)
        
        # Classify based on sensitive flags
        if len(sensitive_flags) >= 3:
            return (
                RiskLevel.AVOID,
                sensitive_flags,
                f"Multiple sensitive keywords: {', '.join(sensitive_flags[:3])}"
            )
        elif len(sensitive_flags) >= 1:
            return (
                RiskLevel.SENSITIVE,
                sensitive_flags,
                f"Contains sensitive content: {', '.join(sensitive_flags)}"
            )
        else:
            return (
                RiskLevel.SAFE,
                [],
                "No risk flags detected"
            )
    
    async def get_top_scored_trends(self, limit: int = 10) -> List[ScoredTrend]:
        """
        Get top scored trends that passed the filter.
        Returns list of ScoredTrend objects ordered by relevance.
        """
        trends = self.db.query(ScoredTrend).filter(
            ScoredTrend.passed_filter == True
        ).order_by(
            ScoredTrend.relevance_score.desc(),
            ScoredTrend.virality_score.desc()
        ).limit(limit).all()
        
        return trends
