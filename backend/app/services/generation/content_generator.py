"""
AI-powered content generation service.
Generates platform-specific content drafts with multiple angles.
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from loguru import logger
import google.generativeai as genai

from app.core.config import settings
from app.models.database import (
    ScoredTrend, Trend, ContentDraft, 
    Platform, ContentAngle, ContentStatus
)


class ContentGenerationService:
    """Service for generating platform-specific content from trends."""
    
    def __init__(self, db: Session):
        self.db = db
        # Initialize Google Gemini
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
        elif settings.OPENAI_API_KEY:
            # Fallback to OpenAI if configured
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.DEFAULT_AI_MODEL
        else:
            logger.warning("No AI API key configured")
            self.model = None
        self.temperature = settings.CONTENT_TEMPERATURE
    
    async def generate_content_for_top_trends(self, limit: int = 5) -> int:
        """
        Generate content for top scored trends that don't have drafts yet.
        Returns count of content pieces generated.
        """
        if not self.model:
            logger.error("AI model not initialized. Check API key configuration.")
            return 0
        
        # Get top trends without content drafts
        scored_trends = self.db.query(ScoredTrend).filter(
            ScoredTrend.passed_filter == True
        ).outerjoin(ContentDraft).filter(
            ContentDraft.id == None
        ).order_by(
            ScoredTrend.relevance_score.desc()
        ).limit(limit).all()
        
        if not scored_trends:
            logger.info("No new trends to generate content for")
            return 0
        
        total_generated = 0
        
        for scored_trend in scored_trends:
            try:
                count = await self.generate_content_for_trend(scored_trend)
                total_generated += count
            except Exception as e:
                logger.error(f"Error generating content for trend {scored_trend.id}: {e}")
        
        logger.info(f"Generated {total_generated} content pieces")
        return total_generated
    
    async def generate_content_for_trend(self, scored_trend: ScoredTrend) -> int:
        """
        Generate content for a single trend across all platforms and angles.
        Returns count of content pieces generated.
        """
        trend = scored_trend.trend
        
        # Determine which angles to generate based on trend characteristics
        angles = self._select_angles(scored_trend)
        
        # Platforms to generate for
        platforms = [Platform.TWITTER, Platform.LINKEDIN, Platform.INSTAGRAM, Platform.FACEBOOK]
        
        generated_count = 0
        
        for angle in angles:
            for platform in platforms:
                try:
                    draft = await self._generate_single_draft(trend, scored_trend, platform, angle)
                    if draft:
                        self.db.add(draft)
                        generated_count += 1
                except Exception as e:
                    logger.error(f"Error generating {platform.value}/{angle.value} for trend {trend.id}: {e}")
        
        self.db.commit()
        return generated_count
    
    def _select_angles(self, scored_trend: ScoredTrend) -> List[ContentAngle]:
        """
        Select appropriate content angles based on trend characteristics.
        """
        angles = []
        
        # Always include explainer for high-relevance trends
        if scored_trend.relevance_score >= 70:
            angles.append(ContentAngle.EXPLAINER)
        
        # Investor angle for economic/policy content
        if scored_trend.macro_impact_score >= 50:
            angles.append(ContentAngle.INVESTOR)
        
        # Property angle if real estate keywords present
        property_keywords = ['real estate', 'housing', 'rent', 'property', 'land', 'mortgage']
        if any(kw in scored_trend.keyword_matches for kw in property_keywords):
            angles.append(ContentAngle.PROPERTY)
        
        # Data-backed for high virality
        if scored_trend.virality_score >= 50:
            angles.append(ContentAngle.DATA_BACKED)
        
        # Contrarian for interesting takes (selective)
        if scored_trend.relevance_score >= 80 and scored_trend.macro_impact_score >= 60:
            angles.append(ContentAngle.CONTRARIAN)
        
        # Default to explainer if no angles selected
        if not angles:
            angles.append(ContentAngle.EXPLAINER)
        
        return angles[:3]  # Limit to 3 angles max
    
    async def _generate_single_draft(
        self,
        trend: Trend,
        scored_trend: ScoredTrend,
        platform: Platform,
        angle: ContentAngle
    ) -> Optional[ContentDraft]:
        """
        Generate a single content draft for a specific platform and angle.
        """
        # Build context for AI
        context = self._build_context(trend, scored_trend, angle)
        
        # Get platform-specific prompt
        prompt = self._build_prompt(context, platform, angle)
        
        # Generate content using AI
        try:
            # Check if using Gemini or OpenAI
            if isinstance(self.model, genai.GenerativeModel):
                # Google Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=1000,
                    )
                )
                generated_text = response.text.strip()
            else:
                # OpenAI (fallback)
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": self._get_system_prompt()
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=self.temperature,
                    max_tokens=1000
                )
                generated_text = response.choices[0].message.content.strip()
            
            # Parse the generated content
            parsed_content = self._parse_generated_content(generated_text, platform)
            
            # Create draft
            draft = ContentDraft(
                scored_trend_id=scored_trend.id,
                platform=platform,
                angle=angle,
                content=parsed_content['content'],
                hook=parsed_content.get('hook'),
                thread=parsed_content.get('thread'),
                carousel_slides=parsed_content.get('carousel_slides'),
                ai_model=self.model,
                status=ContentStatus.PENDING
            )
            
            return draft
        
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return None
    
    def _build_context(self, trend: Trend, scored_trend: ScoredTrend, angle: ContentAngle) -> Dict[str, Any]:
        """Build context dictionary for content generation."""
        return {
            'title': trend.title or '',
            'text': trend.text,
            'url': trend.url,
            'source': trend.source,
            'author': trend.author,
            'timestamp': trend.timestamp.isoformat(),
            'relevance_score': scored_trend.relevance_score,
            'keywords': scored_trend.keyword_matches,
            'macro_impact': scored_trend.macro_impact_score,
            'risk_level': scored_trend.risk_level.value,
            'angle': angle.value
        }
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt that defines brand voice and safety guidelines."""
        return """You are a senior content strategist for a Nigerian real estate and investment media brand.

BRAND VOICE:
- Intelligent and data-aware
- Calm but opinionated
- Slightly contrarian when justified
- Never reckless or sensational
- Professional yet accessible

CRITICAL RULES:
1. Be factual - avoid misinformation
2. Add insight, don't just restate news
3. Consider Nigerian context (naira, Lagos/Abuja, local policy)
4. Sound human-written, not AI-generated
5. Be immediately postable with minimal edits
6. Avoid embarrassing or insensitive takes
7. Focus on real estate, economics, housing, investment angles

SAFETY:
- If the topic is sensitive (death, tragedy, politics), be extra careful
- Frame opinions clearly as opinions, not facts
- Provide context for claims
- Think: "Would a thoughtful founder post this publicly?"

Your goal: Create content that answers "Why does this matter to real estate investors and homeowners in Nigeria?"
"""
    
    def _build_prompt(self, context: Dict[str, Any], platform: Platform, angle: ContentAngle) -> str:
        """Build the user prompt for content generation."""
        
        angle_descriptions = {
            ContentAngle.EXPLAINER: "Explain what's happening and why it matters to real estate/housing",
            ContentAngle.INVESTOR: "Analyze who wins, who loses, and investment implications",
            ContentAngle.PROPERTY: "Focus on how this affects rent, land prices, or housing market",
            ContentAngle.CONTRARIAN: "Provide a contrarian or under-discussed perspective",
            ContentAngle.DATA_BACKED: "Use data, stats, or historical comparison to add depth"
        }
        
        base_prompt = f"""
TREND INFORMATION:
Title: {context['title']}
Content: {context['text']}
Source: {context['source']} by {context['author']}
Keywords: {', '.join(context['keywords'])}

CONTENT ANGLE: {angle_descriptions[angle]}

PLATFORM: {platform.value.upper()}
"""
        
        # Platform-specific instructions
        if platform == Platform.TWITTER:
            base_prompt += """
FORMAT REQUIREMENTS:
- Create a hook tweet (max 280 characters)
- If needed, add 1-3 follow-up tweets for a thread
- Be concise and sharp
- Use Nigerian context
- No hashtags unless truly relevant

OUTPUT FORMAT:
HOOK: [your hook tweet]
THREAD: [optional follow-up tweets, one per line, or write "None"]
"""
        
        elif platform == Platform.LINKEDIN:
            base_prompt += """
FORMAT REQUIREMENTS:
- Professional tone
- Focus on policy, long-term implications
- Founder/investor voice
- 150-300 words
- Clear structure with line breaks

OUTPUT FORMAT:
[Your LinkedIn post content]
"""
        
        elif platform == Platform.INSTAGRAM:
            base_prompt += """
FORMAT REQUIREMENTS:
- Create a carousel outline (5-7 slides)
- Slide 1: Hook headline (5-8 words)
- Slides 2-6: Key points (one per slide, 10-15 words each)
- Final slide: Soft CTA
- Also write a caption (100-150 words)

OUTPUT FORMAT:
SLIDE 1: [Hook headline]
SLIDE 2: [Key point]
SLIDE 3: [Key point]
SLIDE 4: [Key point]
SLIDE 5: [Key point]
SLIDE 6: [CTA]

CAPTION: [Your caption text]
"""
        
        elif platform == Platform.FACEBOOK:
            base_prompt += """
FORMAT REQUIREMENTS:
- Slightly longer explanatory post (200-350 words)
- Clear takeaway
- Accessible to general audience
- Include context for those unfamiliar

OUTPUT FORMAT:
[Your Facebook post content]
"""
        
        base_prompt += "\nGenerate the content now:"
        
        return base_prompt
    
    def _parse_generated_content(self, generated_text: str, platform: Platform) -> Dict[str, Any]:
        """Parse the AI-generated content into structured format."""
        
        result = {'content': generated_text}
        
        if platform == Platform.TWITTER:
            # Parse hook and thread
            lines = generated_text.split('\n')
            hook = None
            thread = []
            
            for line in lines:
                line = line.strip()
                if line.startswith('HOOK:'):
                    hook = line.replace('HOOK:', '').strip()
                elif line.startswith('THREAD:'):
                    thread_text = line.replace('THREAD:', '').strip()
                    if thread_text.lower() != 'none':
                        thread.append(thread_text)
                elif line and not line.startswith(('HOOK:', 'THREAD:', 'FORMAT', 'OUTPUT')):
                    if hook and len(thread) < 3:
                        thread.append(line)
            
            result['hook'] = hook or generated_text[:280]
            result['thread'] = thread if thread else None
            result['content'] = hook or generated_text[:280]
        
        elif platform == Platform.INSTAGRAM:
            # Parse carousel slides and caption
            lines = generated_text.split('\n')
            slides = []
            caption = None
            
            current_section = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('SLIDE'):
                    slide_content = line.split(':', 1)[1].strip() if ':' in line else line
                    slides.append(slide_content)
                elif line.startswith('CAPTION:'):
                    current_section = 'caption'
                    caption = line.replace('CAPTION:', '').strip()
                elif current_section == 'caption' and line:
                    caption = (caption + ' ' + line).strip()
            
            result['carousel_slides'] = slides if slides else None
            result['content'] = caption or generated_text
        
        return result


async def generate_content_batch(db: Session, limit: int = 5) -> Dict[str, int]:
    """
    Standalone function to generate content for top trends.
    Can be called from background workers.
    """
    service = ContentGenerationService(db)
    count = await service.generate_content_for_top_trends(limit)
    return {'generated': count}
