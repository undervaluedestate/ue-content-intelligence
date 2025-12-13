# Cloud Deployment with Supabase (100% FREE!)

Complete guide to deploy your Content Intelligence System with **ZERO monthly costs** using Supabase for the database.

---

## 🎯 What You'll Deploy

- **Backend**: Railway or Fly.io (FastAPI + Cron Jobs)
- **Database**: Supabase (PostgreSQL - FREE forever!)
- **Frontend**: Vercel (Next.js Dashboard - FREE!)
- **AI**: Google Gemini (FREE!)
- **Email**: Gmail API (FREE!)

**Total Monthly Cost**: **$0 FOREVER!** 🎉

---

## 💰 Why Supabase?

✅ **FREE Forever** - No 90-day trial, truly free  
✅ **500MB Database** - More than enough for this system  
✅ **Unlimited API requests** - No throttling  
✅ **Automatic backups** - Daily backups included  
✅ **Built-in Redis** - No separate Redis needed  
✅ **No credit card required** - Just sign up  

---

## 📋 Prerequisites

1. ✅ **GitHub Account** - to host your code
2. ✅ **Supabase Account** - https://supabase.com (FREE!)
3. ✅ **Railway Account** - https://railway.app (FREE $5 credit/month)
4. ✅ **Vercel Account** - https://vercel.com (FREE!)
5. ✅ **Google Gemini API Key** - https://makersuite.google.com/app/apikey (FREE!)
6. ✅ **Gmail API Credentials** - Follow `GMAIL_QUICK_START.md`
7. ⚠️ **Optional**: Twitter API credentials

---

## 🗄️ Part 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com and sign up (FREE!)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `content-intelligence`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., US East)
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup

### 1.2 Get Database Connection String

1. In your Supabase dashboard, go to **"Project Settings"** (gear icon)
2. Click **"Database"** in the left sidebar
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Enable Connection Pooling (Important!)

1. In the same **"Database"** settings page
2. Scroll to **"Connection pooling"**
3. Copy the **"Connection string"** under **"Session mode"**
4. This is optimized for serverless deployments

**You'll need TWO connection strings:**
- **Direct connection**: For migrations and admin tasks
- **Pooled connection**: For your application (use this one!)

---

## 🔧 Part 2: Set Up Gmail API Locally

**Before deploying, authenticate Gmail API locally!**

Follow: `docs/GMAIL_QUICK_START.md`

1. Enable Gmail API in Google Cloud Console
2. Download OAuth2 credentials as `backend/credentials.json`
3. Run authentication to create `token.pickle`

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt

python -c "from app.services.email.gmail_service import GmailService; from app.core.database import SessionLocal; db = SessionLocal(); service = GmailService(db)"
```

---

## 🚀 Part 3: Deploy Backend to Railway

### 3.1 Why Railway?

- ✅ **$5 FREE credit per month** (enough for 24/7 operation)
- ✅ **Automatic deployments** from GitHub
- ✅ **Built-in cron jobs** support
- ✅ **Easy environment variables** management
- ✅ **No credit card required** for free tier

### 3.2 Create Railway Project

1. Go to https://railway.app and sign up
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select your repository
6. Railway will detect it's a Python app

### 3.3 Configure Build Settings

1. In Railway dashboard, click your service
2. Go to **"Settings"**
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 3.4 Upload Secret Files

1. In Railway, go to **"Variables"** tab
2. Click **"RAW Editor"**
3. You'll need to base64 encode your files:

```bash
# On your local machine
cd backend
base64 credentials.json > credentials.b64
base64 token.pickle > token.b64
```

4. Add these as environment variables (we'll decode them in the app)

### 3.5 Configure Environment Variables

Add these in Railway's **"Variables"** tab:

```bash
# Database - Supabase (use POOLED connection string!)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true

# AI - Google Gemini (FREE!)
GOOGLE_API_KEY=AIzaYourActualKeyHere

# Email - Gmail API (FREE!)
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.pickle
ADMIN_EMAIL=your-email@gmail.com
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com

# Gmail credentials (base64 encoded)
GMAIL_CREDENTIALS_B64=<paste base64 from credentials.b64>
GMAIL_TOKEN_B64=<paste base64 from token.b64>

# Application
APP_ENV=production
SECRET_KEY=your-secret-key-change-this-in-production
CORS_ORIGINS=http://localhost:3000

# Optional - Twitter
TWITTER_BEARER_TOKEN=your-token
TWITTER_API_KEY=your-key
TWITTER_API_SECRET=your-secret

# Feature Flags
ENABLE_EMAIL_DIGEST=true
ENABLE_TWITTER_INGESTION=true
ENABLE_GOOGLE_NEWS=true
```

### 3.6 Add Startup Script

Create a startup script to decode the base64 credentials:

Create `backend/railway_start.sh`:

```bash
#!/bin/bash

# Decode Gmail credentials from environment variables
if [ ! -z "$GMAIL_CREDENTIALS_B64" ]; then
    echo "$GMAIL_CREDENTIALS_B64" | base64 -d > credentials.json
    echo "✓ Gmail credentials decoded"
fi

if [ ! -z "$GMAIL_TOKEN_B64" ]; then
    echo "$GMAIL_TOKEN_B64" | base64 -d > token.pickle
    echo "✓ Gmail token decoded"
fi

# Start the application
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Update Railway **Start Command**:
```bash
chmod +x railway_start.sh && ./railway_start.sh
```

### 3.7 Initialize Database

Once deployed, run database initialization:

```bash
# Get your Railway service URL
curl -X POST https://your-app.railway.app/api/v1/init-db
```

Or SSH into Railway and run:
```bash
python scripts/init_db.py
```

---

## 📅 Part 4: Set Up Cron Jobs

### Option A: Railway Cron (Recommended)

Create `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "chmod +x railway_start.sh && ./railway_start.sh",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create separate cron services in Railway:

**Cron 1: Ingestion Pipeline (every 2 hours)**
- Create new service
- Same repo, same settings
- Start command: `python -c "from app.workers.scheduled_jobs import run_ingestion_pipeline; import asyncio; asyncio.run(run_ingestion_pipeline())"`
- Add cron schedule: `0 */2 * * *`

**Cron 2: Daily Digest (8am daily)**
- Create new service
- Same repo, same settings
- Start command: `python -c "from app.workers.scheduled_jobs import send_daily_digest; import asyncio; asyncio.run(send_daily_digest())"`
- Add cron schedule: `0 8 * * *`

### Option B: External Cron (Free alternatives)

Use **cron-job.org** (FREE):
1. Sign up at https://cron-job.org
2. Create two cron jobs:
   - **Ingestion**: `https://your-app.railway.app/api/v1/cron/ingest` (every 2 hours)
   - **Digest**: `https://your-app.railway.app/api/v1/cron/digest` (daily at 8am)

---

## 🌐 Part 5: Deploy Frontend to Vercel

### 5.1 Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 5.2 Add Environment Variable

```bash
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api/v1
```

### 5.3 Deploy

Click **"Deploy"** and wait 2-3 minutes.

Your dashboard will be live at: `https://your-app-name.vercel.app` 🎉

### 5.4 Update Backend CORS

Go back to Railway and update `CORS_ORIGINS`:

```bash
CORS_ORIGINS=https://your-app-name.vercel.app,http://localhost:3000
```

Redeploy the backend.

---

## ✅ Part 6: Initial Setup & Testing

### 6.1 Verify Database Connection

```bash
curl https://your-app.railway.app/health
```

Should return: `{"status": "healthy", "database": "connected"}`

### 6.2 Initialize Data

```bash
# Ingest trends
curl -X POST https://your-app.railway.app/api/v1/trends/ingest

# Score trends
curl -X POST https://your-app.railway.app/api/v1/trends/score

# Generate content
curl -X POST https://your-app.railway.app/api/v1/content/generate?limit=5
```

### 6.3 Test Email

```bash
curl -X POST https://your-app.railway.app/api/v1/digest/send
```

Check your email! 📧

### 6.4 Access Dashboard

Visit: `https://your-app-name.vercel.app`

---

## 💰 Cost Breakdown (100% FREE!)

| Service | Cost | What You Get |
|---------|------|--------------|
| **Supabase** | **$0** | 500MB database, unlimited API requests |
| **Railway** | **$0** | $5 credit/month (enough for 24/7) |
| **Vercel** | **$0** | Hosting + CDN, 100GB bandwidth |
| **Google Gemini** | **$0** | 1,500 requests/day |
| **Gmail API** | **$0** | 500 emails/day |
| **Total** | **$0/month** | Everything you need! 🎉 |

---

## 🔄 Supabase Free Tier Limits

- ✅ **500MB database storage** (plenty for this system)
- ✅ **Unlimited API requests**
- ✅ **Up to 2GB bandwidth/month**
- ✅ **500MB file storage**
- ✅ **50,000 monthly active users**
- ✅ **Daily backups** (7 days retention)

**For this system, you'll use:**
- ~50-100MB database storage
- ~1,000 API requests/day
- ~100MB bandwidth/month

**You're well within the free tier!** ✅

---

## 🛠️ Monitoring & Maintenance

### Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. View:
   - **Database**: Table browser, SQL editor
   - **Logs**: Real-time logs
   - **Reports**: Usage statistics

### Railway Dashboard

1. Go to https://railway.app/dashboard
2. View:
   - **Deployments**: Build logs
   - **Metrics**: CPU, memory, bandwidth
   - **Logs**: Application logs

### Check System Health

```bash
curl https://your-app.railway.app/health
curl https://your-app.railway.app/api/v1/stats
```

---

## 🔧 Troubleshooting

### Database Connection Issues

**Error: "too many connections"**
- Make sure you're using the **pooled connection string** from Supabase
- Connection string should include `?pgbouncer=true`

**Error: "connection timeout"**
- Check your DATABASE_URL is correct
- Verify Supabase project is active

### Railway Issues

**App not starting**
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Check that `railway_start.sh` has execute permissions

**Out of credits**
- Railway gives $5/month free
- Monitor usage in dashboard
- Optimize by reducing instance size if needed

### Gmail Issues

**Token expired**
- Re-authenticate locally
- Re-encode and update `GMAIL_TOKEN_B64` in Railway

---

## 🚀 Alternative: Deploy to Fly.io (Also FREE!)

If you prefer Fly.io over Railway:

1. Sign up at https://fly.io (FREE tier)
2. Install Fly CLI: `brew install flyctl`
3. Create `fly.toml` in backend directory
4. Deploy: `fly deploy`

Fly.io offers:
- 3 shared-cpu VMs (256MB RAM each)
- 3GB persistent storage
- 160GB bandwidth/month

---

## 📊 Comparison: Render vs Supabase

| Feature | Render | Supabase + Railway |
|---------|--------|-------------------|
| **Cost (first 90 days)** | $0 | $0 |
| **Cost (after 90 days)** | $7-17/month | $0 |
| **Database** | 90-day trial | FREE forever |
| **Setup complexity** | Easy | Medium |
| **Scalability** | High | High |
| **Best for** | Production | Cost-conscious |

---

## 🎉 You're Live with $0 Monthly Cost!

Your Content Intelligence System is now running completely FREE:

- ✅ **FREE Database** (Supabase)
- ✅ **FREE Backend** (Railway)
- ✅ **FREE Frontend** (Vercel)
- ✅ **FREE AI** (Google Gemini)
- ✅ **FREE Email** (Gmail API)

**Total: $0/month forever!** 🎉

---

## 📚 Next Steps

1. ✅ Monitor your Supabase usage
2. ✅ Set up database backups (automatic in Supabase)
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring alerts
5. ✅ Start creating content!

---

**Deployment complete! Enjoy your 100% FREE content intelligence system! 🚀**
