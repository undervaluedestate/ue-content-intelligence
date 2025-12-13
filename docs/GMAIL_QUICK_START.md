# Gmail API Quick Start (5 Minutes)

Quick guide to get Gmail API working for your Content Intelligence System.

---

## 🚀 Quick Setup

### 1. Enable Gmail API (2 minutes)

1. Go to: https://console.cloud.google.com/
2. Create a new project: `Content Intelligence System`
3. Enable **Gmail API** from the API Library
4. Create **OAuth consent screen** (External)
5. Add scope: `https://www.googleapis.com/auth/gmail.send`
6. Add your Gmail as a test user

### 2. Get Credentials (1 minute)

1. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
2. Select **Desktop app**
3. Download the JSON file
4. Save as `backend/credentials.json`

### 3. Configure Environment (30 seconds)

Edit `backend/.env`:

```bash
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.pickle
ADMIN_EMAIL=your-email@gmail.com
DIGEST_RECIPIENTS=team@domain.com
```

### 4. Install Dependencies (1 minute)

```bash
cd backend
source venv/bin/activate
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 5. Authenticate (30 seconds)

```bash
python -c "from app.services.email.gmail_service import GmailService; from app.core.database import SessionLocal; db = SessionLocal(); service = GmailService(db)"
```

A browser will open → Sign in → Click "Allow" → Done!

---

## ✅ Test It

```bash
# Check health
python scripts/health_check.py

# Send test digest (if you have pending content)
curl -X POST http://localhost:8000/api/v1/digest/send
```

---

## 📋 Files You Need

```
backend/
├── credentials.json     # OAuth2 credentials (download from Google)
├── token.pickle        # Auto-generated after authentication
└── .env               # Configuration
```

---

## 🔒 Security

**Add to `.gitignore`:**
```
credentials.json
token.pickle
```

**Never commit these files to Git!**

---

## 🚨 Troubleshooting

**"Credentials file not found"**
```bash
# Make sure it's in the right place
ls -la backend/credentials.json
```

**"Token not found"**
```bash
# Run authentication again
rm backend/token.pickle
# Then run step 5 again
```

**"Access blocked"**
- Make sure your email is added as a test user in Google Cloud Console
- Make sure you selected the correct scope

---

## 🌐 For Cloud Deployment (Render)

1. Authenticate locally first (creates `token.pickle`)
2. Upload both files as **Secret Files** in Render:
   - `credentials.json`
   - `token.pickle`
3. Set environment variables:
   ```
   GMAIL_CREDENTIALS_PATH=/etc/secrets/credentials.json
   GMAIL_TOKEN_PATH=/etc/secrets/token.pickle
   ```

---

**That's it! You're now using FREE Gmail API for email delivery! 📧**

For detailed instructions, see: `GMAIL_API_SETUP.md`
