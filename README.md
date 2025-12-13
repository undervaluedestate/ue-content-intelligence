# Trend-to-Content Intelligence & Scheduling Assistant

A production-grade, human-in-the-loop content intelligence system for media-first real estate and investment brands.

## 🎯 What This Does

This system answers the daily question: **"What should we post today, why does it matter, and what's the best way to say it on each platform?"**

### Core Capabilities

1. **Monitors** trends and news from Twitter/X, Google News, and whitelisted sources
2. **Filters** for relevance (real estate, economics, policy) and risk (avoiding sensitive topics)
3. **Generates** multiple content angles (explainer, investor, property, contrarian, data-backed)
4. **Drafts** platform-specific posts for Twitter/X, LinkedIn, Instagram, and Facebook
5. **Enables** human review and approval via dashboard and email
6. **Schedules** approved content or exports to Buffer/Publer/Meta Business Suite

## 🏗️ Architecture

```
Frontend (Vercel)          Backend (Render)           Database (Supabase)
├── Dashboard              ├── FastAPI                ├── PostgreSQL
├── Review UI              ├── Trend Ingestion        ├── Redis Cache
└── Admin Config           ├── AI Generation          └── Audit Logs
                           └── Cron Jobs
```

## 🚀 Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: Next.js 14 + Tailwind CSS
- **Database**: Supabase (PostgreSQL + Redis)
- **AI**: OpenAI GPT-4 / Anthropic Claude
- **Email**: Resend
- **Hosting**: Render (backend) + Vercel (frontend)
- **Queue**: Upstash Redis + Python RQ

## 📦 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Config, security, dependencies
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic
│   │   │   ├── ingestion/    # Trend ingestion
│   │   │   ├── scoring/      # Relevance & risk scoring
│   │   │   ├── generation/   # Content generation
│   │   │   └── scheduling/   # Export & scheduling
│   │   ├── workers/          # Background jobs
│   │   └── utils/            # Helpers
│   ├── tests/
│   ├── requirements.txt
│   └── main.py
│
├── frontend/
│   ├── app/                  # Next.js 14 app directory
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   └── public/
│
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    └── CONFIGURATION.md
```

## 🔧 Quick Setup (Automated)

### One-Command Setup

```bash
./setup.sh
```

This script will:
- ✅ Create Python virtual environment
- ✅ Install all dependencies (backend + frontend)
- ✅ Create environment files
- ✅ Initialize database with tables
- ✅ Seed 12 curated Nigerian Twitter accounts
- ✅ Add sample test data
- ✅ Run health checks

### Manual Setup

If you prefer manual setup, see [QUICKSTART.md](QUICKSTART.md)

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key (required)
- Twitter/X API access (optional)
- Resend API key (optional, for email digest)

### After Setup

1. **Edit `backend/.env`** with your API keys:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   TWITTER_BEARER_TOKEN=your-token  # optional
   RESEND_API_KEY=re_your-key       # optional
   ```

2. **Start the backend**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

3. **Start the frontend** (new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the system**:
   - Dashboard: http://localhost:3000
   - API Docs: http://localhost:8000/docs

## 🌍 Deployment

### Backend (Render)

1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set environment variables
4. Deploy

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 🎛️ Configuration

Admins can configure:

- **Keywords to track**: real estate, housing, inflation, naira, etc.
- **Topics to avoid**: Sensitive political topics, tragedies
- **Platforms**: Enable/disable Twitter, LinkedIn, Instagram, Facebook
- **Email frequency**: Daily, twice daily, weekly
- **Tone slider**: Neutral ↔ Bold

## 🔒 Safety & Compliance

- ✅ **No autonomous posting** - All content requires human approval
- ✅ **Risk classification** - Filters out sensitive/dangerous topics
- ✅ **Fact-checking prompts** - AI instructed to avoid misinformation
- ✅ **Audit logging** - Full history of all decisions
- ✅ **Brand tone enforcement** - Intelligent, calm, data-aware voice

## 📊 Success Metrics

The system is successful if:

1. Users consistently post from its suggestions
2. Content feels timely and relevant
3. No reputational incidents occur
4. The tool becomes a daily decision assistant

## 🤝 Contributing

This is an internal tool. For questions or improvements, contact the development team.

## 📄 License

Proprietary - Internal use only

---

**Built with ❤️ for thoughtful, data-driven content creation**
# ue-content-intelligence
