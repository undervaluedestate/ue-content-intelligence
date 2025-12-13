# Google Gemini Setup Guide

Google Gemini is **completely FREE** and perfect for this content intelligence system!

---

## Why Google Gemini?

✅ **Completely FREE** - No credit card required  
✅ **Generous limits** - 60 requests per minute  
✅ **High quality** - Similar to GPT-3.5, better than many paid options  
✅ **No expiration** - Unlike OpenAI's $5 trial credits  
✅ **Easy setup** - Get API key in 2 minutes  

---

## Get Your Free API Key (2 Minutes)

### Step 1: Go to Google AI Studio

Visit: https://makersuite.google.com/app/apikey

Or: https://aistudio.google.com/app/apikey

### Step 2: Sign in with Google Account

Use any Google account (Gmail, Workspace, etc.)

### Step 3: Create API Key

1. Click **"Create API Key"**
2. Select **"Create API key in new project"** (or use existing project)
3. Copy the API key (starts with `AIza...`)

**That's it!** No credit card, no payment info needed.

---

## Add API Key to Your System

### Option 1: Edit .env file directly

Open `backend/.env` and add:

```bash
GOOGLE_API_KEY=AIzaYourActualKeyHere
```

### Option 2: Use command line

```bash
cd backend
echo "GOOGLE_API_KEY=AIzaYourActualKeyHere" >> .env
```

---

## Test Your Setup

### Start the backend:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Generate test content:

```bash
curl -X POST http://localhost:8000/api/v1/content/generate?limit=1
```

You should see content being generated using Gemini!

---

## Free Tier Limits

**Google Gemini Free Tier:**
- ✅ 60 requests per minute
- ✅ 1,500 requests per day
- ✅ No expiration
- ✅ No credit card required

**This is more than enough for:**
- Generating 100+ content pieces per day
- Running the system 24/7
- Testing and development
- Small to medium production use

---

## Comparison: Gemini vs OpenAI

| Feature | Google Gemini | OpenAI GPT-4 | OpenAI GPT-3.5 |
|---------|---------------|--------------|----------------|
| **Cost** | FREE | $0.01-0.03/piece | $0.001-0.003/piece |
| **Quality** | High | Highest | Good |
| **Speed** | Fast | Medium | Very Fast |
| **Limits** | 60/min, 1500/day | Pay-per-use | Pay-per-use |
| **Setup** | No card needed | Credit card required | Credit card required |

**Verdict**: Gemini is perfect for this use case!

---

## Troubleshooting

### "API key not valid"

- Make sure you copied the entire key (starts with `AIza`)
- Check for extra spaces or quotes
- Regenerate the key if needed

### "Quota exceeded"

- Free tier: 60 requests/minute, 1500/day
- Wait a minute and try again
- For higher limits, upgrade to paid tier (still very cheap)

### "Model not found"

- Make sure you're using `gemini-pro` (default)
- Check your API key is active

---

## Upgrading to Paid (Optional)

If you need more than the free tier:

**Gemini Pro** (Pay-as-you-go):
- $0.00025 per 1K characters input
- $0.0005 per 1K characters output
- ~$0.001-0.002 per content piece
- Still **90% cheaper than GPT-4**

To upgrade:
1. Go to Google Cloud Console
2. Enable billing
3. Same API key works automatically

---

## Best Practices

### 1. Monitor Usage

Check your usage at: https://aistudio.google.com/app/apikey

### 2. Rate Limiting

The system automatically handles rate limits, but if you're generating a lot of content:

```python
# In backend/.env
MAX_TRENDS_PER_CYCLE=10  # Reduce if hitting limits
```

### 3. Optimize Prompts

Gemini works best with:
- Clear, structured prompts ✅
- Specific instructions ✅
- Examples when needed ✅

(Already optimized in the system!)

---

## FAQ

**Q: Is Gemini really free forever?**  
A: Yes! The free tier has no expiration. Google may change limits in the future, but it's been stable for months.

**Q: Do I need a credit card?**  
A: No! Completely free, no payment info required.

**Q: How does Gemini compare to GPT-4?**  
A: Gemini Pro is comparable to GPT-3.5 Turbo. For most content generation tasks, it's excellent. GPT-4 is slightly better but costs 100x more.

**Q: Can I use both Gemini and OpenAI?**  
A: Yes! The system supports both. It will use Gemini if `GOOGLE_API_KEY` is set, otherwise falls back to OpenAI.

**Q: What if I hit the free tier limits?**  
A: 1,500 requests/day = ~300-500 content pieces. If you need more, upgrade to paid (still very cheap).

---

## Next Steps

1. ✅ Get your free API key: https://makersuite.google.com/app/apikey
2. ✅ Add to `backend/.env`
3. ✅ Start the backend
4. ✅ Generate your first content!

---

**You're all set! Enjoy unlimited FREE AI-powered content generation! 🎉**
