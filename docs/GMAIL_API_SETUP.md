# Gmail API Setup Guide

This guide will help you set up Gmail API for sending daily digest emails from your Content Intelligence System.

---

## Why Gmail API?

✅ **Completely FREE** - No cost for sending emails  
✅ **No daily limits** - Send as many emails as you need  
✅ **Use your own Gmail** - Send from your actual Gmail account  
✅ **Reliable delivery** - Better deliverability than third-party services  
✅ **No credit card required** - Just a Google account  

---

## Step 1: Enable Gmail API in Google Cloud Console

### 1.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 1.2 Create a New Project (or use existing)

1. Click on the project dropdown at the top
2. Click **"New Project"**
3. Name it: `Content Intelligence System`
4. Click **"Create"**

### 1.3 Enable Gmail API

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Gmail API"**
3. Click on **"Gmail API"**
4. Click **"Enable"**

---

## Step 2: Create OAuth2 Credentials

### 2.1 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**

**Fill in the required fields:**
- **App name**: `Content Intelligence System`
- **User support email**: Your email
- **Developer contact email**: Your email

4. Click **"Save and Continue"**

### 2.2 Add Scopes

1. Click **"Add or Remove Scopes"**
2. Search for: `https://www.googleapis.com/auth/gmail.send`
3. Select it
4. Click **"Update"**
5. Click **"Save and Continue"**

### 2.3 Add Test Users

1. Click **"Add Users"**
2. Add your Gmail address (the one you'll use to send emails)
3. Click **"Save and Continue"**

### 2.4 Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Desktop app"**
4. Name it: `Content Intelligence Desktop`
5. Click **"Create"**

### 2.5 Download Credentials

1. Click the **Download** button (⬇️) next to your OAuth client
2. Save the file as `credentials.json`
3. Move it to your backend directory:

```bash
mv ~/Downloads/client_secret_*.json /Users/user/Documents/Business/undervaluedEstateSocial/backend/credentials.json
```

---

## Step 3: Configure Your Application

### 3.1 Update Environment Variables

Edit `backend/.env`:

```bash
# Email Service - Gmail API
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.pickle

# Your Gmail address
ADMIN_EMAIL=your-email@gmail.com

# Recipients for daily digest
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com
```

### 3.2 Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

---

## Step 4: Authenticate Your Application

### 4.1 Run Authentication

The first time you send an email, the system will open a browser window for authentication:

```bash
cd backend
source venv/bin/activate
python -c "from app.services.email.gmail_service import GmailService; from app.core.database import SessionLocal; db = SessionLocal(); service = GmailService(db)"
```

### 4.2 Complete OAuth Flow

1. A browser window will open
2. Sign in with your Gmail account
3. Click **"Allow"** to grant permissions
4. You'll see: "The authentication flow has completed"
5. Close the browser window

### 4.3 Verify Token Created

Check that `token.pickle` was created:

```bash
ls -la backend/token.pickle
```

---

## Step 5: Test Email Sending

### 5.1 Test the Email Service

```bash
cd backend
python -c "
from app.services.email.gmail_service import GmailService
from app.core.database import SessionLocal
from app.models.database import ContentDraft, ContentStatus
import asyncio

db = SessionLocal()
service = GmailService(db)

# Get some pending content
drafts = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.PENDING).limit(5).all()

if drafts:
    result = asyncio.run(service.send_digest(drafts))
    print('Result:', result)
else:
    print('No pending content to test with')
"
```

### 5.2 Check Your Inbox

Check the recipient email addresses - you should receive the daily digest!

---

## Step 6: Deploy to Cloud (Render)

### 6.1 Important: Token Management

**For cloud deployment, you have two options:**

#### Option A: Pre-authenticate Locally (Recommended)

1. Authenticate locally (Step 4) to create `token.pickle`
2. Upload `token.pickle` to Render as a secret file
3. The token will refresh automatically when needed

#### Option B: Use Service Account (Advanced)

For production, consider using a Service Account instead of OAuth2:
1. Create a Service Account in Google Cloud Console
2. Enable domain-wide delegation
3. Use service account credentials instead

### 6.2 Add Files to Render

**Upload credentials.json:**
1. Go to Render dashboard → Your service
2. Go to **"Environment"** tab
3. Add **"Secret Files"**:
   - Filename: `credentials.json`
   - Contents: Paste your credentials.json content

**Upload token.pickle (after local authentication):**
1. Add another **"Secret File"**:
   - Filename: `token.pickle`
   - Contents: Upload your local token.pickle file

### 6.3 Update Environment Variables in Render

```bash
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=/etc/secrets/credentials.json
GMAIL_TOKEN_PATH=/etc/secrets/token.pickle
ADMIN_EMAIL=your-email@gmail.com
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com
```

---

## Troubleshooting

### "Credentials file not found"

Make sure `credentials.json` is in the backend directory:
```bash
ls -la backend/credentials.json
```

### "Token has been expired or revoked"

Delete `token.pickle` and re-authenticate:
```bash
rm backend/token.pickle
# Then run authentication again (Step 4.1)
```

### "Access blocked: This app's request is invalid"

1. Go to Google Cloud Console
2. OAuth consent screen
3. Make sure your email is added as a test user
4. Make sure the app is not in production mode

### "Insufficient Permission"

Make sure you granted the `gmail.send` scope during authentication.

### "Daily sending limit exceeded"

Gmail has a daily sending limit:
- **Regular Gmail**: 500 emails/day
- **Google Workspace**: 2,000 emails/day

For this system, you'll typically send 1-5 emails per day, so this shouldn't be an issue.

---

## Security Best Practices

### 1. Keep Credentials Secure

✅ **DO:**
- Keep `credentials.json` and `token.pickle` private
- Add them to `.gitignore`
- Use environment variables for paths

❌ **DON'T:**
- Commit credentials to Git
- Share credentials publicly
- Hardcode credentials in code

### 2. Token Management

- `token.pickle` contains your access token
- It automatically refreshes when expired
- Keep it secure like a password

### 3. Scope Limitation

- Only request `gmail.send` scope
- Don't request read or modify permissions
- Principle of least privilege

---

## Switching Back to Resend (Optional)

If you want to switch back to Resend:

1. Edit `backend/.env`:
```bash
USE_GMAIL_API=false
RESEND_API_KEY=re_your-resend-key-here
```

2. Restart your application

The system will automatically fall back to Resend.

---

## FAQ

**Q: Is Gmail API really free?**  
A: Yes! There's no cost for using Gmail API to send emails from your own account.

**Q: How many emails can I send per day?**  
A: 500 emails/day for regular Gmail, 2,000/day for Google Workspace. More than enough for daily digests.

**Q: Do I need a Google Workspace account?**  
A: No! A regular free Gmail account works perfectly.

**Q: What happens if my token expires?**  
A: The system automatically refreshes it using the refresh token.

**Q: Can I use multiple Gmail accounts?**  
A: Yes, but you'll need separate credentials for each account.

**Q: Is this better than Resend?**  
A: For low-volume use (like daily digests), Gmail API is perfect and free. Resend is better for high-volume transactional emails.

---

## Next Steps

1. ✅ Enable Gmail API in Google Cloud Console
2. ✅ Download OAuth2 credentials
3. ✅ Configure environment variables
4. ✅ Authenticate your application
5. ✅ Test email sending
6. ✅ Deploy to cloud

---

**You're all set! Enjoy FREE email delivery with Gmail API! 📧**
