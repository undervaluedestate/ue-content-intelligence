"""
Gmail API service for sending daily content review emails.
Uses OAuth2 credentials to send emails via Gmail API.
"""

import base64
import os
import pickle
from datetime import datetime
from typing import List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.database import ContentDraft

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False
    logger.warning("Gmail API libraries not available. Install with: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")


# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']


class GmailService:
    """Service for sending email digests via Gmail API."""
    
    def __init__(self, db: Session):
        self.db = db
        self.service = None
        
        if GMAIL_AVAILABLE:
            self.service = self._get_gmail_service()
    
    def _get_gmail_service(self):
        """
        Authenticate and return Gmail API service.
        Uses OAuth2 credentials stored in token.pickle or credentials.json.
        """
        creds = None
        token_path = Path(settings.GMAIL_TOKEN_PATH) if hasattr(settings, 'GMAIL_TOKEN_PATH') else Path('token.pickle')
        credentials_path = Path(settings.GMAIL_CREDENTIALS_PATH) if hasattr(settings, 'GMAIL_CREDENTIALS_PATH') else Path('credentials.json')
        
        # Load existing token
        if token_path.exists():
            try:
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)
            except Exception as e:
                logger.warning(f"Could not load token: {e}")
        
        # If no valid credentials, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    logger.info("Gmail credentials refreshed")
                except Exception as e:
                    logger.error(f"Error refreshing credentials: {e}")
                    creds = None
            
            # If still no valid creds, need to authenticate
            if not creds:
                if not credentials_path.exists():
                    logger.error(f"Gmail credentials file not found at {credentials_path}")
                    logger.error("Please download OAuth2 credentials from Google Cloud Console")
                    return None
                
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        str(credentials_path), SCOPES)
                    creds = flow.run_local_server(port=0)
                    logger.info("Gmail authentication successful")
                except Exception as e:
                    logger.error(f"Error during Gmail authentication: {e}")
                    return None
            
            # Save credentials for next run
            try:
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
                logger.info(f"Gmail token saved to {token_path}")
            except Exception as e:
                logger.warning(f"Could not save token: {e}")
        
        try:
            service = build('gmail', 'v1', credentials=creds)
            return service
        except Exception as e:
            logger.error(f"Error building Gmail service: {e}")
            return None
    
    async def send_digest(self, content_drafts: List[ContentDraft]) -> dict:
        """
        Send daily digest email with pending content for review.
        """
        if not GMAIL_AVAILABLE:
            logger.warning("Gmail API not available. Install required packages.")
            return {'status': 'skipped', 'reason': 'gmail_not_available'}
        
        if not self.service:
            logger.warning("Gmail service not configured. Check credentials.")
            return {'status': 'skipped', 'reason': 'gmail_not_configured'}
        
        if not content_drafts:
            return {'status': 'skipped', 'reason': 'no_content'}
        
        # Build email HTML
        html_content = self._build_digest_html(content_drafts)
        
        # Send email to each recipient
        results = []
        recipients = settings.digest_recipients_list
        
        for recipient in recipients:
            try:
                message = self._create_message(
                    sender=settings.ADMIN_EMAIL,
                    to=recipient,
                    subject=f"Daily Content Review - {len(content_drafts)} Posts Ready",
                    html_content=html_content
                )
                
                sent_message = self.service.users().messages().send(
                    userId='me',
                    body=message
                ).execute()
                
                results.append({
                    'recipient': recipient,
                    'status': 'success',
                    'message_id': sent_message.get('id')
                })
                logger.info(f"Digest sent to {recipient}")
                
            except HttpError as error:
                logger.error(f"Error sending to {recipient}: {error}")
                results.append({
                    'recipient': recipient,
                    'status': 'error',
                    'error': str(error)
                })
            except Exception as e:
                logger.error(f"Unexpected error sending to {recipient}: {e}")
                results.append({
                    'recipient': recipient,
                    'status': 'error',
                    'error': str(e)
                })
        
        # Count successes
        success_count = sum(1 for r in results if r['status'] == 'success')
        
        if success_count > 0:
            return {
                'status': 'success',
                'recipients': success_count,
                'content_count': len(content_drafts),
                'results': results
            }
        else:
            return {
                'status': 'error',
                'error': 'Failed to send to any recipients',
                'results': results
            }
    
    def _create_message(self, sender: str, to: str, subject: str, html_content: str) -> dict:
        """
        Create a message for Gmail API.
        """
        message = MIMEMultipart('alternative')
        message['to'] = to
        message['from'] = sender
        message['subject'] = subject
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        return {'raw': raw_message}
    
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
