"""
Simple Gmail SMTP service using OAuth2 credentials.
Works with individual OAuth credentials (client_id, client_secret, refresh_token).
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from datetime import datetime

from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.database import ContentDraft


class GmailSMTPService:
    """Service for sending email digests via Gmail SMTP with OAuth2."""
    
    def __init__(self, db: Session):
        self.db = db
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
    
    def _get_oauth2_string(self) -> str:
        """
        Generate OAuth2 authentication string for Gmail SMTP.
        """
        import base64
        
        auth_string = f"user={settings.GMAIL_USER}\1auth=Bearer {self._get_access_token()}\1\1"
        return base64.b64encode(auth_string.encode()).decode()
    
    def _get_access_token(self) -> str:
        """
        Get access token using refresh token.
        """
        import requests
        
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": settings.GMAIL_API_CLIENT_ID,
            "client_secret": settings.GMAIL_API_CLIENT_SECRET,
            "refresh_token": settings.GMAIL_API_REFRESH_TOKEN,
            "grant_type": "refresh_token"
        }
        
        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            return response.json()["access_token"]
        except Exception as e:
            logger.error(f"Error getting access token: {e}")
            raise
    
    async def send_digest(self, content_drafts: List[ContentDraft]) -> dict:
        """
        Send daily digest email with pending content for review.
        """
        if not content_drafts:
            logger.info("No content drafts to send in digest")
            return {"status": "skipped", "reason": "no_content"}
        
        try:
            # Build email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"📊 Daily Content Review - {len(content_drafts)} items ready"
            msg['From'] = settings.GMAIL_USER
            msg['To'] = settings.DIGEST_RECIPIENTS
            
            # Create HTML content
            html_content = self._build_digest_html(content_drafts)
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email using SMTP with OAuth2
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                
                # Use app password if available, otherwise OAuth2
                if hasattr(settings, 'GMAIL_PASS') and settings.GMAIL_PASS:
                    # Simple app password authentication
                    server.login(settings.GMAIL_USER, settings.GMAIL_PASS)
                else:
                    # OAuth2 authentication
                    auth_string = self._get_oauth2_string()
                    server.docmd('AUTH', 'XOAUTH2 ' + auth_string)
                
                server.send_message(msg)
            
            logger.info(f"Digest email sent successfully to {settings.DIGEST_RECIPIENTS}")
            return {
                "status": "success",
                "recipient": settings.DIGEST_RECIPIENTS,
                "content_count": len(content_drafts)
            }
            
        except Exception as e:
            logger.error(f"Error sending digest email: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _build_digest_html(self, content_drafts: List[ContentDraft]) -> str:
        """Build HTML email content for the digest."""
        
        # Group drafts by trend
        trends_map = {}
        for draft in content_drafts:
            trend_id = draft.scored_trend_id
            if trend_id not in trends_map:
                trends_map[trend_id] = []
            trends_map[trend_id].append(draft)
        
        # Build HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
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
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        .trend-block {{
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-left: 4px solid #3498db;
            border-radius: 4px;
        }}
        .trend-title {{
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        .trend-meta {{
            font-size: 13px;
            color: #7f8c8d;
            margin-bottom: 10px;
        }}
        .content-draft {{
            margin: 15px 0;
            padding: 15px;
            background-color: white;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
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
        .content-text {{
            margin: 15px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
            font-size: 14px;
            white-space: pre-wrap;
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
        <p>You have <strong>{len(content_drafts)} content pieces</strong> ready for review across <strong>{len(trends_map)} trends</strong>.</p>
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
                    <span style="color: #666; font-size: 13px;">{angle_display}</span>
                </div>
                <div class="content-text">{draft.content[:500]}{'...' if len(draft.content) > 500 else ''}</div>
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
