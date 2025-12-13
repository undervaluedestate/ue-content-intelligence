# Getting Started with Content Intelligence System

Welcome! This guide will help you get your Content Intelligence System up and running in minutes.

---

## 🎯 What You're Building

A **human-in-the-loop content intelligence system** that:

1. **Monitors** Nigerian real estate, economic, and policy trends
2. **Filters** for relevance and safety
3. **Generates** platform-specific content drafts
4. **Enables** your team to review and approve
5. **Schedules** approved content for posting

**Key Principle**: The AI assists, but humans decide. Zero autonomous posting.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Setup Script

```bash
./setup.sh
```

This automatically:
- Creates Python virtual environment
- Installs all dependencies
- Initializes database
- Seeds 12 curated Nigerian Twitter accounts
- Adds sample test data

### Step 2: Add Your OpenAI API Key

Edit `backend/.env`:

```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

Get your key at: https://platform.openai.com/api-keys

### Step 3: Start the System

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Open Dashboard

Visit: http://localhost:3000

You should see:
- Sample trends already loaded
- Stats dashboard
- Ready to generate content

---

## 📝 Your First Content Generation

### Option 1: Via Dashboard

1. Open http://localhost:3000
2. Click "Review Content" button
3. You'll see sample content already generated from test data

### Option 2: Via API

```bash
# Generate content from trends
curl -X POST http://localhost:8000/api/v1/content/generate?limit=5
```

Then refresh the dashboard to see new content.

---

## 🎨 Understanding the Workflow

### 1. Trend Ingestion (Automated)

**Sources:**
- Twitter/X (whitelisted accounts)
- Google News (Nigerian economy, real estate, housing)

**Frequency:** Every 2 hours (configurable)

**Manual trigger:**
```bash
curl -X POST http://localhost:8000/api/v1/trends/ingest
```

### 2. Relevance Scoring (Automated)

Each trend gets scored on:
- **Relevance** (0-100): Based on keyword matching
- **Risk Level**: Safe / Sensitive / Avoid
- **Virality**: Engagement velocity
- **Macro Impact**: Economic/housing impact

**Manual trigger:**
```bash
curl -X POST http://localhost:8000/api/v1/trends/score
```

### 3. Content Generation (Automated)

For each high-scoring trend, AI generates:

**Content Angles:**
- Explainer: "What's happening & why it matters"
- Investor: "Who wins, who loses"
- Property: "How this affects rent/housing"
- Contrarian: "What most people are missing"
- Data-backed: "Stats and historical context"

**Platforms:**
- Twitter/X (with threads)
- LinkedIn (professional tone)
- Instagram (carousel slides)
- Facebook (longer explanatory)

**Manual trigger:**
```bash
curl -X POST http://localhost:8000/api/v1/content/generate?limit=5
```

### 4. Human Review (Manual)

**Via Dashboard:**
1. Go to http://localhost:3000/content
2. Review each content piece
3. Click "Approve", "Edit", or "Reject"

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/content/approve \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": 1,
    "action": "approve",
    "approved_by": "your@email.com"
  }'
```

### 5. Scheduling (Manual)

After approval, you can:
- Copy to clipboard
- Export to Buffer/Publer
- Schedule for later

---

## 🔧 Configuration

### Pre-Configured Nigerian Accounts

The system comes with 12 curated accounts:

**Real Estate:**
- @NigeriaPropertyCentre
- @PropertyProNG

**Economics/Policy:**
- @BudgITng
- @cenbank (Central Bank of Nigeria)
- @NigerianStat

**News:**
- @PremiumTimesng
- @thecableng
- @channelstv

**Analysts:**
- @MrFixNigeria
- @DoubleEph

**Business:**
- @nairametrics
- @BusinessDayNG

### Pre-Configured Keywords

**Property:** real estate, land, rent, housing, mortgage, property, landlord, tenant

**Economy:** power, gas, inflation, naira, policy, investment, cbn, economy, subsidy, fuel

**Location:** lagos, abuja, nigeria

### Adjusting Settings

Edit `backend/app/core/config.py` or use the API:

```bash
# Change relevance threshold
RELEVANCE_THRESHOLD=70  # Higher = fewer but better trends

# Change AI model
DEFAULT_AI_MODEL=gpt-3.5-turbo  # Cheaper, faster

# Change content temperature
CONTENT_TEMPERATURE=0.5  # Lower = more conservative
```

---

## 📊 Monitoring Your System

### View Stats

Dashboard: http://localhost:3000

Or via API:
```bash
curl http://localhost:8000/api/v1/stats
```

Returns:
```json
{
  "trends": {
    "total": 150,
    "processed": 145,
    "passed_filter": 42
  },
  "content": {
    "pending": 15,
    "approved": 8,
    "rejected": 2,
    "scheduled": 3
  }
}
```

### Health Check

```bash
cd backend
python scripts/health_check.py
```

Checks:
- ✓ Database connectivity
- ✓ OpenAI API
- ✓ Twitter API (if configured)
- ✓ Email service (if configured)

---

## 🎯 Daily Workflow

### Morning (8am)

1. **Receive email digest** with pending content
2. **Review in dashboard** (http://localhost:3000/content)
3. **Approve/edit/reject** each piece
4. **Schedule** approved content

### Throughout the Day

System automatically:
- Ingests new trends (every 2 hours)
- Scores for relevance
- Generates content
- Queues for your review

### Evening

1. **Check dashboard** for new pending content
2. **Review trends** that passed filter
3. **Adjust settings** if needed

---

## 🔐 Adding API Keys

### OpenAI (Required)

1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Add to `backend/.env`:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   ```

### Twitter (Optional but Recommended)

1. Go to https://developer.twitter.com
2. Create app and get credentials
3. Add to `backend/.env`:
   ```bash
   TWITTER_BEARER_TOKEN=your-token
   TWITTER_API_KEY=your-key
   TWITTER_API_SECRET=your-secret
   ```

### Resend (Optional - for Email Digest)

1. Go to https://resend.com
2. Create account and get API key
3. Add to `backend/.env`:
   ```bash
   RESEND_API_KEY=re_your-key
   DIGEST_RECIPIENTS=team@domain.com,founder@domain.com
   ```

---

## 🚨 Troubleshooting

### "Module not found" errors

```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### No trends appearing

1. Check if Twitter API is configured
2. Or rely on Google News (works without credentials)
3. Manually trigger ingestion:
   ```bash
   curl -X POST http://localhost:8000/api/v1/trends/ingest
   ```

### Content generation fails

1. Verify OpenAI API key is set
2. Check you have API credits
3. View logs for errors

### Frontend can't connect to backend

1. Ensure backend is running on port 8000
2. Check `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

---

## 📚 Next Steps

### Learn More

- **Full Documentation**: See `docs/` folder
- **API Reference**: http://localhost:8000/docs
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Configuration**: `docs/CONFIGURATION.md`

### Customize

1. **Add more keywords** in `backend/app/core/config.py`
2. **Adjust brand voice** in `backend/app/services/generation/content_generator.py`
3. **Add whitelisted accounts** via API or database
4. **Configure platforms** to enable/disable

### Deploy to Production

When ready, deploy to cloud:
- **Backend**: Render (free tier)
- **Frontend**: Vercel (free tier)
- **Total cost**: ~$7-22/month

See `docs/DEPLOYMENT.md` for complete guide.

---

## 🎉 You're Ready!

Your Content Intelligence System is now running. Start by:

1. ✅ Reviewing the sample content in the dashboard
2. ✅ Approving/rejecting a few pieces to get familiar
3. ✅ Triggering new content generation
4. ✅ Customizing keywords and settings

**Remember**: This is a decision support tool, not a bot. You're in control. The AI just does the heavy lifting.

---

## 💬 Need Help?

- **API Docs**: http://localhost:8000/docs
- **Health Check**: `python backend/scripts/health_check.py`
- **Logs**: Check terminal output for errors
- **Documentation**: See `docs/` folder

**Happy content creating! 🚀**
