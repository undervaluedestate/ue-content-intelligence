# Quick Start Guide

Get the Content Intelligence System running locally in 10 minutes.

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or use SQLite for testing)
- Redis (optional for local development)

---

## Backend Setup (5 minutes)

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create environment file
```bash
cp .env.example .env
```

### 5. Edit `.env` with your settings

**Minimum required:**
```bash
DATABASE_URL=sqlite:///./content_intelligence.db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-change-this
OPENAI_API_KEY=sk-your-openai-key-here
ADMIN_EMAIL=admin@example.com
DIGEST_RECIPIENTS=team@example.com
```

### 6. Start the server
```bash
uvicorn main:app --reload
```

The API will be available at: http://localhost:8000

Visit http://localhost:8000/docs for interactive API documentation.

---

## Frontend Setup (5 minutes)

### 1. Open new terminal and navigate to frontend
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create environment file
```bash
cp .env.local.example .env.local
```

### 4. Edit `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 5. Start the development server
```bash
npm run dev
```

The dashboard will be available at: http://localhost:3000

---

## First Run

### 1. Trigger initial ingestion
```bash
curl -X POST http://localhost:8000/api/v1/trends/ingest
```

### 2. Score the trends
```bash
curl -X POST http://localhost:8000/api/v1/trends/score
```

### 3. Generate content
```bash
curl -X POST http://localhost:8000/api/v1/content/generate?limit=5
```

### 4. View in dashboard

Open http://localhost:3000 and you should see:
- Stats on the dashboard
- Pending content for review
- Trends that passed filters

---

## Testing the System

### Add a whitelisted Twitter account

Create a Python script `add_account.py`:

```python
import asyncio
from app.services.ingestion.trend_ingestion import TrendIngestionService
from app.core.database import SessionLocal

async def main():
    db = SessionLocal()
    service = TrendIngestionService(db)
    
    # Add a Nigerian real estate account
    await service.add_whitelisted_account(
        platform="twitter",
        username="NigeriaPropertyCentre",
        category="real_estate",
        priority=3
    )
    
    print("Account added successfully!")
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:
```bash
cd backend
python add_account.py
```

---

## Common Commands

### Backend

```bash
# Start server
uvicorn main:app --reload

# Run tests
pytest

# Format code
black .

# Check types
mypy .
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### Database errors
```bash
# Reset database (WARNING: deletes all data)
rm content_intelligence.db  # If using SQLite
# Then restart the server to recreate tables
```

### API connection errors
- Check backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check CORS settings in backend `.env`

### No trends being ingested
- Add Twitter API credentials to `.env`
- Or rely on Google News (works without credentials)
- Check logs for errors

---

## Next Steps

1. **Configure keywords**: Edit `backend/app/core/config.py`
2. **Add whitelisted accounts**: Use the API or Python script
3. **Customize brand voice**: Edit `backend/app/services/generation/content_generator.py`
4. **Deploy to production**: See [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Need Help?

- **API Documentation**: http://localhost:8000/docs
- **Full Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Configuration Guide**: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- **API Reference**: [docs/API.md](docs/API.md)

---

**You're all set! 🚀**

The system is now running locally. Start reviewing content and approving posts!
