# .env Setup Guide for Your Content Intelligence System

This guide will help you create your `.env` file with all the necessary credentials.

---

## 🔐 Step 1: Create Your .env File

```bash
cd /Users/user/Documents/Business/undervaluedEstateSocial/backend
cp .env.example .env
```

Now edit the `.env` file with your actual credentials:

---

## 📝 Step 2: Fill in Your Credentials

### **Database - Supabase (Your Project ID: lypihswzetjlttelrpfn)**

Get your connection string from Supabase:
1. Go to: https://supabase.com/dashboard/project/lypihswzetjlttelrpfn/settings/database
2. Scroll to **"Connection pooling"** section
3. Copy the **"Session mode"** connection string

```bash
# Replace this line in .env:
DATABASE_URL=postgresql://postgres.lypihswzetjlttelrpfn:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual Supabase database password!

---

### **AI - Google Gemini (FREE!)**

Get your API key from: https://makersuite.google.com/app/apikey

```bash
# Replace this line in .env:
GOOGLE_API_KEY=AIzaYourActualKeyHere
```

---

### **Email - Gmail API (FREE!)**

Keep these settings as-is (you'll set up Gmail API next):

```bash
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.pickle
```

Update your email addresses:

```bash
ADMIN_EMAIL=your-actual-email@gmail.com
DIGEST_RECIPIENTS=team@yourdomain.com,founder@yourdomain.com
```

---

### **Application Settings**

Generate a secure secret key:

```bash
# On Mac/Linux, run this command to generate a secure key:
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Then update in `.env`:

```bash
SECRET_KEY=your-generated-secret-key-here
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

---

### **Optional - Twitter API**

If you have Twitter API credentials, add them:

```bash
TWITTER_BEARER_TOKEN=your-token
TWITTER_API_KEY=your-key
TWITTER_API_SECRET=your-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_SECRET=your-access-secret
```

If not, you can skip this - the system will use Google News instead.

---

## 📋 Complete .env Template

Here's what your complete `.env` file should look like:

```bash
# Database - Supabase
DATABASE_URL=postgresql://postgres.lypihswzetjlttelrpfn:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Redis (optional for local development)
REDIS_URL=redis://localhost:6379/0

# AI Services - Google Gemini (FREE!)
GOOGLE_API_KEY=AIzaYourActualKeyHere

# Email Service - Gmail API (FREE!)
USE_GMAIL_API=true
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.pickle
ADMIN_EMAIL=your-email@gmail.com
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com

# Application Settings
APP_ENV=development
SECRET_KEY=your-generated-secret-key-here
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:3000

# Content Generation Settings
DEFAULT_AI_MODEL=gemini-pro
CONTENT_TEMPERATURE=0.7
MAX_TRENDS_PER_CYCLE=20
RELEVANCE_THRESHOLD=60

# Scheduling
INGESTION_INTERVAL_HOURS=2
DIGEST_TIME=08:00
DIGEST_TIMEZONE=Africa/Lagos

# Feature Flags
ENABLE_TWITTER_INGESTION=false
ENABLE_GOOGLE_NEWS=true
ENABLE_EMAIL_DIGEST=true
ENABLE_NATIVE_SCHEDULING=false

# Logging
LOG_LEVEL=INFO
```

---

## ✅ Step 3: Verify Your .env File

Check that your `.env` file exists and is NOT tracked by Git:

```bash
# Check if file exists
ls -la backend/.env

# Verify it's in .gitignore (should show the file)
git check-ignore backend/.env
```

If the last command shows `backend/.env`, that's good - it means Git is ignoring it! ✅

---

## 🔑 Step 4: Get Your Supabase Password

If you forgot your Supabase password:

1. Go to: https://supabase.com/dashboard/project/lypihswzetjlttelrpfn/settings/database
2. Scroll to **"Reset database password"**
3. Click **"Reset database password"**
4. Copy the new password
5. Update your `.env` file with the new password

---

## 🧪 Step 5: Test Your Configuration

```bash
cd backend
source venv/bin/activate

# Test database connection
python -c "from app.core.config import settings; print('✓ Config loaded:', settings.DATABASE_URL[:30]+'...')"

# Initialize database
python scripts/init_db.py

# Start the server
uvicorn main:app --reload
```

Visit: http://localhost:8000/docs

You should see the API documentation! 🎉

---

## 🚨 Security Reminders

✅ **DO:**
- Keep `.env` file local only
- Never commit `.env` to Git
- Use different credentials for production
- Rotate secrets regularly

❌ **DON'T:**
- Share your `.env` file
- Commit `.env` to GitHub
- Use the same secrets in production and development
- Hardcode secrets in your code

---

## 📚 Next Steps

After setting up your `.env`:

1. **Set up Gmail API**: Follow `docs/GMAIL_QUICK_START.md`
2. **Initialize database**: Run `python scripts/init_db.py`
3. **Test locally**: Run `uvicorn main:app --reload`
4. **Deploy to cloud**: Follow `docs/SUPABASE_DEPLOYMENT.md`

---

## 🆘 Need Help?

**Can't find your Supabase password?**
- Reset it in Supabase dashboard → Settings → Database

**Database connection fails?**
- Make sure you're using the **pooled connection string** (port 6543)
- Check that your password doesn't have special characters that need escaping

**Gmail API not working?**
- Make sure you've completed the Gmail API setup first
- Check that `credentials.json` and `token.pickle` exist

---

**Your .env file is ready! Keep it secure! 🔒**
