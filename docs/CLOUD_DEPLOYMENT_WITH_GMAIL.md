# Cloud Deployment Guide (Render + Vercel + Gmail API)

Complete guide to deploy your Content Intelligence System to the cloud with **FREE** Gmail API for email delivery.

---

## 🎯 What You'll Deploy

- **Backend**: Render (FastAPI + PostgreSQL + Redis + Cron Jobs)
- **Frontend**: Vercel (Next.js Dashboard)
- **AI**: Google Gemini (FREE!)
- **Email**: Gmail API (FREE!)

**Total Monthly Cost**: $0-17 (after 90-day free trial)

---

## 📋 Prerequisites

1. ✅ **GitHub Account** - to host your code
2. ✅ **Render Account** - https://render.com (free)
3. ✅ **Vercel Account** - https://vercel.com (free)
4. ✅ **Google Gemini API Key** - https://makersuite.google.com/app/apikey (FREE!)
5. ✅ **Gmail API Credentials** - Follow `GMAIL_QUICK_START.md` first
6. ⚠️ **Optional**: Twitter API credentials

---

## 🔧 Part 1: Set Up Gmail API Locally

**Before deploying, you must authenticate Gmail API locally!**

### 1.1 Enable Gmail API

Follow the quick start guide: `docs/GMAIL_QUICK_START.md`

1. Enable Gmail API in Google Cloud Console
2. Create OAuth2 credentials
3. Download as `backend/credentials.json`

### 1.2 Authenticate Locally

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Run authentication
python -c "from app.services.email.gmail_service import GmailService; from app.core.database import SessionLocal; db = SessionLocal(); service = GmailService(db)"
```

This will:
- Open a browser for authentication
- Create `token.pickle` file
- Save your OAuth2 token

### 1.3 Verify Files Created

```bash
ls -la backend/credentials.json
ls -la backend/token.pickle
```

Both files should exist!

---

## 🚀 Part 2: Push Code to GitHub

```bash
cd /Users/user/Documents/Business/undervaluedEstateSocial

# Make sure credentials are in .gitignore (already done!)
git add .
git commit -m "Add Gmail API integration for email delivery"

# Push to GitHub
git push origin main
```

**Important**: `.gitignore` already excludes `credentials.json` and `token.pickle` ✅

---

## 🖥️ Part 3: Deploy Backend to Render

### 3.1 Create Render Deployment

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `backend/render.yaml` and create:
   - Web Service (FastAPI API)
   - PostgreSQL Database
   - Redis Instance
   - 2 Cron Jobs (Ingestion + Daily Digest)

### 3.2 Upload Secret Files

**IMPORTANT**: You must upload your Gmail credentials!

1. Go to your Render service dashboard
2. Click **"Environment"** tab
3. Scroll to **"Secret Files"**
4. Click **"Add Secret File"**

**File 1: credentials.json**
- Filename: `credentials.json`
- Contents: Copy and paste the entire contents of your local `backend/credentials.json`

**File 2: token.pickle**
- Filename: `token.pickle`
- Contents: Upload your local `backend/token.pickle` file

### 3.3 Configure Environment Variables

Add these environment variables in Render:

**Required - AI (Google Gemini - FREE!):**
```bash
GOOGLE_API_KEY=AIzaYourActualKeyHere
```

**Required - Email (Gmail API - FREE!):**
```bash
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=/etc/secrets/credentials.json
GMAIL_TOKEN_PATH=/etc/secrets/token.pickle
ADMIN_EMAIL=your-email@gmail.com
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com
```

**Required - Application:**
```bash
SECRET_KEY=your-secret-key-change-this-in-production
```

**Optional - Twitter:**
```bash
TWITTER_BEARER_TOKEN=your-token
TWITTER_API_KEY=your-key
TWITTER_API_SECRET=your-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_SECRET=your-access-secret
```

**CORS (update after frontend deployment):**
```bash
CORS_ORIGINS=http://localhost:3000
```

### 3.4 Deploy

Click **"Deploy"** and wait for the build to complete.

Your API will be live at: `https://your-app-name.onrender.com`

### 3.5 Test Your API

Visit: `https://your-app-name.onrender.com/docs`

You should see the FastAPI documentation! 🎉

---

## 🌐 Part 4: Deploy Frontend to Vercel

### 4.1 Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 4.2 Add Environment Variable

```bash
NEXT_PUBLIC_API_URL=https://your-app-name.onrender.com/api/v1
```

### 4.3 Deploy

Click **"Deploy"** and wait 2-3 minutes.

Your dashboard will be live at: `https://your-app-name.vercel.app` 🎉

### 4.4 Update Backend CORS

Go back to Render and update `CORS_ORIGINS`:

```bash
CORS_ORIGINS=https://your-app-name.vercel.app,http://localhost:3000
```

Redeploy the backend.

---

## ✅ Part 5: Initial Setup & Testing

### 5.1 Trigger First Data Ingestion

```bash
# Ingest trends
curl -X POST https://your-app-name.onrender.com/api/v1/trends/ingest

# Score trends
curl -X POST https://your-app-name.onrender.com/api/v1/trends/score

# Generate content (using FREE Gemini!)
curl -X POST https://your-app-name.onrender.com/api/v1/content/generate?limit=5
```

### 5.2 Test Email Digest

```bash
# Send test digest (if you have pending content)
curl -X POST https://your-app-name.onrender.com/api/v1/digest/send
```

Check your email - you should receive the digest via Gmail! 📧

### 5.3 Access Your Dashboard

Visit: `https://your-app-name.vercel.app`

You should see:
- ✅ Dashboard with stats
- ✅ Pending content for review
- ✅ Trends that passed filters

---

## 💰 Cost Breakdown

### **FREE Forever:**
- ✅ **Google Gemini**: FREE (1,500 requests/day)
- ✅ **Gmail API**: FREE (500 emails/day)
- ✅ **Vercel**: FREE hosting + CDN
- ✅ **Render Web Service**: FREE (750 hours/month)

### **Free for 90 Days, Then Paid:**
- **Render PostgreSQL**: $7/month (after 90-day trial)
- **Render Redis**: $10/month (optional, after trial)

### **Total Monthly Cost:**
- **First 90 days**: $0/month 🎉
- **After trial**: $7-17/month

**This is 90% cheaper than using OpenAI + Resend!**

---

## 🔄 Automated Operations

Once deployed, your system runs automatically:

1. **Every 2 hours**: Ingestion pipeline
   - Fetches trends from Twitter/Google News
   - Scores for relevance and risk
   - Generates content using FREE Gemini

2. **Daily at 8am (Lagos time)**: Email digest
   - Sends pending content via FREE Gmail API
   - Includes approve/reject actions

---

## 🛠️ Monitoring & Troubleshooting

### Check System Health

```bash
curl https://your-app-name.onrender.com/health
```

### View Stats

```bash
curl https://your-app-name.onrender.com/api/v1/stats
```

### View Logs

- **Render**: Check logs in the Render dashboard
- **Vercel**: Check logs in the Vercel dashboard

### Common Issues

**Backend won't start?**
- Check that `GOOGLE_API_KEY` is set
- Check that Gmail secret files are uploaded
- View logs in Render dashboard

**Frontend can't connect?**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check `CORS_ORIGINS` includes your Vercel URL

**Email not sending?**
- Check that `credentials.json` and `token.pickle` are uploaded as secret files
- Check paths: `/etc/secrets/credentials.json` and `/etc/secrets/token.pickle`
- View cron job logs in Render

**Gmail token expired?**
- The token should auto-refresh
- If it doesn't, re-authenticate locally and re-upload `token.pickle`

---

## 🔒 Security Checklist

- ✅ Never commit `.env` files
- ✅ Never commit `credentials.json`
- ✅ Never commit `token.pickle`
- ✅ Use environment variables for all secrets
- ✅ Keep your Google API key private
- ✅ Rotate API keys regularly
- ✅ Enable HTTPS only (automatic on Render/Vercel)
- ✅ Review audit logs regularly

---

## 🔄 Updating Gmail Token

If your Gmail token expires or needs to be refreshed:

1. **Re-authenticate locally:**
   ```bash
   rm backend/token.pickle
   python -c "from app.services.email.gmail_service import GmailService; from app.core.database import SessionLocal; db = SessionLocal(); service = GmailService(db)"
   ```

2. **Re-upload to Render:**
   - Go to Environment → Secret Files
   - Update `token.pickle` with the new file

3. **Redeploy** the service

---

## 📊 Monitoring Email Delivery

### Check Email Logs

In Render dashboard:
1. Go to your cron job: `content-intelligence-digest`
2. View logs to see email delivery status

### Gmail Sending Limits

- **Regular Gmail**: 500 emails/day
- **Google Workspace**: 2,000 emails/day

For daily digests (1-5 emails/day), this is more than enough!

---

## 🎉 You're Live!

Your Content Intelligence System is now running on the cloud with:

- ✅ **FREE AI** (Google Gemini)
- ✅ **FREE Email** (Gmail API)
- ✅ Automated trend monitoring
- ✅ Beautiful review dashboard
- ✅ Scheduled cron jobs
- ✅ **Total cost: $0-17/month**

**Next Steps:**
1. Open your Vercel dashboard URL
2. Review the generated content
3. Approve/edit/reject content pieces
4. Check your email for daily digests
5. Start creating better content faster!

---

## 📚 Additional Resources

- **Gmail Quick Start**: `docs/GMAIL_QUICK_START.md`
- **Gmail Setup Guide**: `docs/GMAIL_API_SETUP.md`
- **Gemini Setup**: `docs/GEMINI_SETUP.md`
- **Getting Started**: `GETTING_STARTED.md`
- **Project Summary**: `PROJECT_SUMMARY.md`

---

**Deployment complete! Enjoy your FREE AI-powered content system! 🚀**
