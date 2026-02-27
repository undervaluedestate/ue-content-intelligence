# Content Intelligence System - TypeScript Backend

Modern TypeScript/Node.js backend for the Content Intelligence System.

## 🚀 Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** Supabase
- **AI:** OpenAI API
- **Email:** Gmail SMTP (Nodemailer)

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- OpenAI API key
- Gmail account with App Password

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - OpenAI model (default: `gpt-4o-mini`)
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - Your Gmail App Password

### 3. Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `schema.sql`
3. Run the SQL script

## 🏃 Running

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Stats
```bash
GET /api/v1/stats
```

### Trends
```bash
# Ingest trends from Google News
POST /api/v1/trends/ingest

# Score unprocessed trends
POST /api/v1/trends/score

# Get filtered trends
GET /api/v1/trends?limit=20&min_relevance=40

# Get all trends (debug)
GET /api/v1/trends/all?limit=20
```

### Content
```bash
# Generate content for top trends
POST /api/v1/content/generate?limit=5

# Get content drafts
GET /api/v1/content?status=pending

# Approve content
PUT /api/v1/content/:id/approve

# Reject content
PUT /api/v1/content/:id/reject
```

### Digest
```bash
# Send email digest
POST /api/v1/digest/send
```

## 🧪 Testing the Full Workflow

```bash
# 1. Check health
curl http://localhost:3000/health

# 2. Ingest trends
curl -X POST http://localhost:3000/api/v1/trends/ingest

# 3. Score trends
curl -X POST http://localhost:3000/api/v1/trends/score

# 4. Check stats
curl http://localhost:3000/api/v1/stats

# 5. View relevant trends
curl "http://localhost:3000/api/v1/trends?min_relevance=40&limit=10"

# 6. Generate content
curl -X POST "http://localhost:3000/api/v1/content/generate?limit=5"

# 7. View content
curl http://localhost:3000/api/v1/content

# 8. Send digest
curl -X POST http://localhost:3000/api/v1/digest/send
```

## 🚀 Deployment to Render

### 1. Create `render.yaml`

Already included in the project root.

### 2. Push to GitHub

```bash
git add .
git commit -m "Add TypeScript backend"
git push
```

### 3. Deploy on Render

1. Go to Render Dashboard
2. New → Web Service
3. Connect your GitHub repo
4. Select `backend-ts` as root directory
5. Build Command: `npm install && npm run build`
6. Start Command: `npm start`
7. Add environment variables from `.env` (including `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`)
8. Deploy!

## 🔧 Troubleshooting

### Gmail Issues

**Error: "Invalid login"**
- Use Gmail App Password, not your account password
- Enable 2FA on your Google account first
- Generate App Password: https://myaccount.google.com/apppasswords

## 📝 Project Structure

```
backend-ts/
├── src/
│   ├── config/          # Configuration and database client
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   │   ├── ingestion/   # Trend ingestion from Google News
│   │   ├── scoring/     # Relevance scoring
│   │   ├── generation/  # AI content generation
│   │   └── email/       # Email digest service
│   └── index.ts         # Main server file
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── manual-migration.sql  # Manual SQL migration
├── schema.sql           # Supabase schema + RLS policies
├── .env                 # Environment variables (gitignored)
├── .env.example         # Example environment variables
└── package.json         # Dependencies and scripts
```

## 🎯 Key Features

- ✅ **Real-time News Ingestion** - Fetches Nigerian real estate and business news
- ✅ **AI-Powered Scoring** - Filters relevant trends using keyword matching
- ✅ **Content Generation** - Creates social media posts using OpenAI
- ✅ **Email Digests** - Sends daily content summaries via Gmail
- ✅ **TypeScript** - Full type safety and IDE support
- ✅ **Hot Reload** - Fast development with tsx watch mode

## 📚 Next Steps

1. ✅ Run manual SQL migration in Supabase
2. ✅ Test all endpoints locally
3. ✅ Deploy to Render
4. ✅ Update frontend to point to new backend
5. ✅ Set up cron jobs for automated ingestion

---

**Built with ❤️ for Undervalued Estate**
