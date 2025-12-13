# Configuration Guide

This guide explains how to configure the Content Intelligence System for your specific needs.

---

## Environment Variables

### Backend Configuration

Create a `.env` file in the `backend/` directory based on `.env.example`:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/content_intelligence
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-change-in-production

# AI Service (at least one required)
OPENAI_API_KEY=sk-your-openai-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Email
ADMIN_EMAIL=admin@yourdomain.com
DIGEST_RECIPIENTS=team@yourdomain.com,founder@yourdomain.com

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### Optional Variables

```bash
# Twitter/X API (for trend ingestion)
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-twitter-access-token
TWITTER_ACCESS_SECRET=your-twitter-access-secret

# Email Service
RESEND_API_KEY=re_your-resend-key-here

# Meta Business API (for native scheduling)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_ACCESS_TOKEN=your-long-lived-access-token

# Content Settings
DEFAULT_AI_MODEL=gpt-4-turbo-preview
CONTENT_TEMPERATURE=0.7
MAX_TRENDS_PER_CYCLE=20
RELEVANCE_THRESHOLD=60

# Scheduling
INGESTION_INTERVAL_HOURS=2
DIGEST_TIME=08:00
DIGEST_TIMEZONE=Africa/Lagos

# Feature Flags
ENABLE_TWITTER_INGESTION=true
ENABLE_GOOGLE_NEWS=true
ENABLE_EMAIL_DIGEST=true
ENABLE_NATIVE_SCHEDULING=false

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration

Create a `.env.local` file in the `frontend/` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
```

---

## Keyword Configuration

### Default Nigerian Keywords

The system comes pre-configured with Nigerian real estate and economic keywords:

**Property Keywords:**
- real estate, land, rent, housing, mortgage, property
- landlord, tenant

**Economic Keywords:**
- power, gas, inflation, naira, policy, investment
- cbn, economy, subsidy, fuel, electricity

**Location Keywords:**
- lagos, abuja, nigeria

### Adding Custom Keywords

Use the API to add custom keywords:

```bash
curl -X POST https://your-api.com/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{
    "key": "custom_keywords",
    "value": ["keyword1", "keyword2", "keyword3"],
    "updated_by": "admin@example.com"
  }'
```

Or update in the database directly via the `configurations` table.

---

## Risk Classification

### Sensitive Keywords

Topics that will be flagged as "sensitive" (require extra caution):

- death, died, killed, tragedy, accident
- bomb, terror, kidnap, murder
- protest, riot, clash

**Action:** Content will still be generated but marked as sensitive for careful review.

### Avoid Keywords

Topics that will be completely filtered out:

- explicit, nsfw, porn, xxx

**Action:** Trends containing these keywords are immediately rejected.

### Customizing Risk Keywords

Update in `backend/app/core/config.py`:

```python
SENSITIVE_KEYWORDS: List[str] = [
    "death", "died", "killed", "tragedy", "accident",
    # Add your custom sensitive keywords
]

AVOID_KEYWORDS: List[str] = [
    "explicit", "nsfw", "porn", "xxx",
    # Add your custom avoid keywords
]
```

---

## Content Generation Settings

### AI Model Selection

**GPT-4 Turbo (Recommended):**
```bash
DEFAULT_AI_MODEL=gpt-4-turbo-preview
CONTENT_TEMPERATURE=0.7
```

**GPT-3.5 Turbo (Faster, cheaper):**
```bash
DEFAULT_AI_MODEL=gpt-3.5-turbo
CONTENT_TEMPERATURE=0.7
```

**Claude 3 (Alternative):**
```bash
DEFAULT_AI_MODEL=claude-3-sonnet-20240229
CONTENT_TEMPERATURE=0.7
```

### Temperature Settings

- `0.3-0.5`: More conservative, factual content
- `0.7`: Balanced (recommended)
- `0.8-1.0`: More creative, varied content

### Relevance Threshold

Controls which trends get content generated:

```bash
RELEVANCE_THRESHOLD=60  # 0-100 scale
```

- `40-60`: More content, lower quality
- `60-70`: Balanced (recommended)
- `70-90`: Less content, higher quality

---

## Scheduling Configuration

### Ingestion Frequency

How often to check for new trends:

```bash
INGESTION_INTERVAL_HOURS=2  # Every 2 hours (recommended)
```

Options:
- `1`: Every hour (more frequent, higher costs)
- `2`: Every 2 hours (recommended)
- `4`: Every 4 hours (less frequent)

### Digest Schedule

When to send daily email digest:

```bash
DIGEST_TIME=08:00
DIGEST_TIMEZONE=Africa/Lagos
```

Common times:
- `08:00`: Morning review
- `18:00`: Evening review
- `06:00`: Early morning prep

---

## Platform Configuration

### Enabling/Disabling Platforms

Control which platforms to generate content for:

```bash
ENABLE_TWITTER_INGESTION=true
ENABLE_GOOGLE_NEWS=true
ENABLE_EMAIL_DIGEST=true
ENABLE_NATIVE_SCHEDULING=false
```

### Platform-Specific Settings

Edit in `backend/app/services/generation/content_generator.py`:

```python
# Platforms to generate for
platforms = [
    Platform.TWITTER,
    Platform.LINKEDIN,
    Platform.INSTAGRAM,
    Platform.FACEBOOK
]
```

Remove any platform you don't want content for.

---

## Whitelisted Accounts

### Adding Twitter Accounts to Monitor

Via API:
```bash
curl -X POST https://your-api.com/api/v1/whitelisted-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "username": "BudgITng",
    "category": "policy",
    "priority": 2
  }'
```

Via Python:
```python
from app.services.ingestion.trend_ingestion import TrendIngestionService
from app.core.database import SessionLocal

db = SessionLocal()
service = TrendIngestionService(db)

await service.add_whitelisted_account(
    platform="twitter",
    username="NigeriaPropertyCentre",
    category="real_estate",
    priority=3
)
```

### Recommended Nigerian Accounts

**Real Estate:**
- @NigeriaPropertyCentre
- @PropertyProNG
- @RealEstateNG

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

---

## Brand Voice Customization

### Tone Slider

Edit the system prompt in `backend/app/services/generation/content_generator.py`:

**Current (Balanced):**
```python
BRAND VOICE:
- Intelligent and data-aware
- Calm but opinionated
- Slightly contrarian when justified
- Never reckless or sensational
```

**More Conservative:**
```python
BRAND VOICE:
- Strictly factual and neutral
- Data-driven analysis only
- No opinions, just insights
- Professional and measured
```

**More Bold:**
```python
BRAND VOICE:
- Sharp and opinionated
- Contrarian by default
- Data-backed hot takes
- Provocative but never reckless
```

---

## Email Digest Customization

### Recipients

Add multiple recipients:
```bash
DIGEST_RECIPIENTS=team@domain.com,founder@domain.com,content@domain.com
```

### Email Template

Edit in `backend/app/services/email/digest_service.py`:

- Modify HTML structure
- Change colors/branding
- Add/remove sections
- Customize action buttons

---

## Database Configuration

### PostgreSQL Settings

**Development:**
```bash
DATABASE_URL=postgresql://localhost:5432/content_intelligence
```

**Production (Render):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Production (Supabase):**
```bash
DATABASE_URL=postgresql://postgres:pass@db.supabase.co:5432/postgres
```

### Redis Settings

**Development:**
```bash
REDIS_URL=redis://localhost:6379/0
```

**Production (Upstash):**
```bash
REDIS_URL=redis://default:pass@host.upstash.io:6379
```

---

## Monitoring & Logging

### Log Levels

```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

**Development:** `DEBUG` (verbose)  
**Production:** `INFO` (balanced)  
**Production (quiet):** `WARNING` (errors only)

### Viewing Logs

**Local development:**
```bash
tail -f logs/app.log
```

**Render:**
- Dashboard → Your Service → Logs

**Vercel:**
- Dashboard → Your Project → Deployments → View Function Logs

---

## Performance Tuning

### Batch Sizes

```bash
MAX_TRENDS_PER_CYCLE=20  # How many trends to process per cycle
```

- `10-15`: Faster, less content
- `20`: Balanced (recommended)
- `30-50`: Slower, more content

### API Rate Limits

Add rate limiting in `backend/main.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/trends")
@limiter.limit("10/minute")
async def get_trends():
    ...
```

---

## Security Best Practices

1. **Never commit `.env` files**
   - Add to `.gitignore`
   - Use environment variables in production

2. **Rotate API keys regularly**
   - OpenAI: Monthly
   - Twitter: Quarterly
   - Database: Annually

3. **Use strong SECRET_KEY**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. **Limit CORS origins**
   ```bash
   CORS_ORIGINS=https://yourdomain.com
   # NOT: CORS_ORIGINS=*
   ```

5. **Enable HTTPS only**
   - Automatic on Render/Vercel
   - Force HTTPS redirects

---

## Troubleshooting

### Content quality is poor
- Increase `RELEVANCE_THRESHOLD` to 70+
- Switch to GPT-4 from GPT-3.5
- Reduce `CONTENT_TEMPERATURE` to 0.5

### Too few trends passing filter
- Decrease `RELEVANCE_THRESHOLD` to 50
- Add more keywords
- Check risk classification isn't too strict

### Email digest not sending
- Verify `RESEND_API_KEY` is set
- Check `DIGEST_RECIPIENTS` format
- View cron job logs

### High API costs
- Use GPT-3.5 instead of GPT-4
- Reduce `MAX_TRENDS_PER_CYCLE`
- Increase `INGESTION_INTERVAL_HOURS`

---

## Support

For configuration help:
1. Check logs for errors
2. Review API documentation
3. Test with `/health` endpoint
4. Contact development team

---

**Configuration complete! Your system is now tuned to your needs.**
