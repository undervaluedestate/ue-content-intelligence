"""
Email digest service for sending daily content review emails.
Supports both Gmail API (default) and Resend (legacy).
"""

from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.database import ContentDraft

# Try to import Gmail services
try:
    from app.services.email.gmail_service import GmailService
    from app.services.email.gmail_smtp_service import GmailSMTPService
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False
    logger.warning("Gmail service not available.")

# Try to import Resend (legacy)
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend library not available.")


class EmailDigestService:
    """Service for sending email digests to content reviewers."""
    
    def __init__(self, db: Session):
        self.db = db
        self.gmail_service = None
        
        # Initialize Gmail service if enabled
        if settings.USE_GMAIL_API and GMAIL_AVAILABLE:
            # Use SMTP service if we have OAuth credentials or app password
            if (hasattr(settings, 'GMAIL_USER') and settings.GMAIL_USER and 
                (settings.GMAIL_PASS or settings.GMAIL_API_REFRESH_TOKEN)):
                self.gmail_service = GmailSMTPService(db)
                logger.info("Using Gmail SMTP for email delivery")
            else:
                # Fall back to file-based Gmail API
                self.gmail_service = GmailService(db)
                logger.info("Using Gmail API for email delivery")
        # Fall back to Resend if Gmail not available
        elif RESEND_AVAILABLE and settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY
            logger.info("Using Resend for email delivery")
        else:
            logger.warning("No email service configured")
    
    async def send_digest(self, content_drafts: List[ContentDraft]) -> dict:
        """
        Send daily digest email with pending content for review.
        Uses Gmail API by default, falls back to Resend if configured.
        """
        if not content_drafts:
            return {'status': 'skipped', 'reason': 'no_content'}
        
        # Try Gmail API first
        if settings.USE_GMAIL_API and self.gmail_service:
            return await self.gmail_service.send_digest(content_drafts)
        
        # Fall back to Resend
        if RESEND_AVAILABLE and settings.RESEND_API_KEY:
            return await self._send_via_resend(content_drafts)
        
        logger.warning("Email service not configured. Skipping digest.")
        return {'status': 'skipped', 'reason': 'email_not_configured'}
    
    async def _send_via_resend(self, content_drafts: List[ContentDraft]) -> dict:
        """
        Send email via Resend (legacy method).
        """
        # Build email HTML
        html_content = self._build_digest_html(content_drafts)
        
        # Send email
        try:
            params = {
                "from": f"Content Intelligence <{settings.ADMIN_EMAIL}>",
                "to": settings.digest_recipients_list,
                "subject": f"Daily Content Review - {len(content_drafts)} Posts Ready",
                "html": html_content,
            }
            
            email = resend.Emails.send(params)
            
            logger.info(f"Digest sent to {len(settings.digest_recipients_list)} recipients via Resend")
            return {
                'status': 'success',
                'email_id': email.get('id'),
                'recipients': len(settings.digest_recipients_list),
                'content_count': len(content_drafts)
            }
        
        except Exception as e:
            logger.error(f"Error sending digest email via Resend: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def _build_digest_html(self, content_drafts: List[ContentDraft]) -> str:
        """Build HTML email content for the digest."""
        
        # Group by trend
        trends_map = {}
        for draft in content_drafts:
            trend_id = draft.scored_trend.trend.id if draft.scored_trend else 0
            if trend_id not in trends_map:
                trends_map[trend_id] = []
            trends_map[trend_id].append(draft)
        
        # Build HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #1a1a1a;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }}
        .trend-block {{
            margin: 30px 0;
            padding: 20px;
            background-color: #fafafa;
            border-left: 4px solid #4CAF50;
            border-radius: 4px;
        }}
        .trend-title {{
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }}
        .trend-meta {{
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }}
        .content-draft {{
            margin: 15px 0;
            padding: 15px;
            background-color: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
        }}
        .platform-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }}
        .twitter {{ background-color: #1DA1F2; color: white; }}
        .linkedin {{ background-color: #0077B5; color: white; }}
        .instagram {{ background-color: #E4405F; color: white; }}
        .facebook {{ background-color: #1877F2; color: white; }}
        .angle-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            background-color: #f0f0f0;
            color: #333;
        }}
        .content-text {{
            margin: 15px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
            font-size: 14px;
            white-space: pre-wrap;
        }}
        .action-buttons {{
            margin-top: 15px;
        }}
        .btn {{
            display: inline-block;
            padding: 10px 20px;
            margin-right: 10px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
        }}
        .btn-approve {{
            background-color: #4CAF50;
            color: white;
        }}
        .btn-reject {{
            background-color: #f44336;
            color: white;
        }}
        .btn-edit {{
            background-color: #2196F3;
            color: white;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Daily Content Review</h1>
        <p>Good morning! You have <strong>{len(content_drafts)} content pieces</strong> ready for review across <strong>{len(trends_map)} trends</strong>.</p>
        
"""
        
        # Add each trend block
        for trend_id, drafts in trends_map.items():
            if not drafts:
                continue
            
            trend = drafts[0].scored_trend.trend if drafts[0].scored_trend else None
            if not trend:
                continue
            
            scored = drafts[0].scored_trend
            
            html += f"""
        <div class="trend-block">
            <div class="trend-title">{trend.title or trend.text[:100]}</div>
            <div class="trend-meta">
                📍 Source: {trend.source} | 
                ⭐ Relevance: {scored.relevance_score:.0f}/100 | 
                🔒 Risk: {scored.risk_level.value.upper()} |
                📅 {trend.timestamp.strftime('%Y-%m-%d %H:%M')}
            </div>
            <div style="margin: 10px 0; font-size: 14px; color: #555;">
                {trend.text[:300]}{'...' if len(trend.text) > 300 else ''}
            </div>
            
"""
            
            # Add each content draft for this trend
            for draft in drafts:
                platform_class = draft.platform.value.lower()
                angle_display = draft.angle.value.replace('_', ' ').title()
                
                html += f"""
            <div class="content-draft">
                <div>
                    <span class="platform-badge {platform_class}">{draft.platform.value.upper()}</span>
                    <span class="angle-badge">{angle_display}</span>
                </div>
                <div class="content-text">{draft.content[:500]}{'...' if len(draft.content) > 500 else ''}</div>
                <div class="action-buttons">
                    <a href="#" class="btn btn-approve">✓ Approve</a>
                    <a href="#" class="btn btn-edit">✏️ Edit</a>
                    <a href="#" class="btn btn-reject">✗ Reject</a>
                </div>
            </div>
"""
            
            html += """
        </div>
"""
        
        html += f"""
        <div class="footer">
            <p>This is an automated digest from your Content Intelligence System.</p>
            <p>Generated at {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
    </div>
</body>
</html>
"""
        
        return html
