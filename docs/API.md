# API Documentation

Base URL: `http://localhost:8000/api/v1` (development) or `https://your-app.onrender.com/api/v1` (production)

## Authentication

Currently, the API does not require authentication. For production, consider adding API keys or JWT tokens.

---

## Endpoints

### Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Stats

**GET** `/stats`

Get system statistics.

**Response:**
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

---

### Trends

#### Get Trends

**GET** `/trends`

Get filtered trends with scores.

**Query Parameters:**
- `limit` (int, default: 20, max: 100): Number of trends to return
- `min_relevance` (int, 0-100): Minimum relevance score
- `risk_level` (string): Filter by risk level (safe, sensitive, avoid)

**Response:**
```json
[
  {
    "id": 1,
    "source": "twitter",
    "title": "CBN raises interest rates",
    "text": "Central Bank of Nigeria increases interest rates to 18.5%...",
    "url": "https://twitter.com/...",
    "author": "BudgITng",
    "timestamp": "2024-01-15T08:00:00Z",
    "likes": 245,
    "shares": 89,
    "relevance_score": 85.5,
    "risk_level": "safe",
    "keyword_matches": ["cbn", "interest rate", "naira", "economy"]
  }
]
```

#### Trigger Ingestion

**POST** `/trends/ingest`

Manually trigger trend ingestion from all sources.

**Response:**
```json
{
  "status": "success",
  "results": {
    "twitter_trending": 0,
    "twitter_accounts": 12,
    "google_news": 8
  }
}
```

#### Trigger Scoring

**POST** `/trends/score`

Manually trigger scoring of unprocessed trends.

**Response:**
```json
{
  "status": "success",
  "scored_count": 20
}
```

---

### Content

#### Get Content Drafts

**GET** `/content`

Get content drafts with optional filters.

**Query Parameters:**
- `status` (string): Filter by status (pending, approved, rejected, scheduled)
- `platform` (string): Filter by platform (twitter, linkedin, instagram, facebook)
- `limit` (int, default: 50, max: 200): Number of drafts to return

**Response:**
```json
[
  {
    "id": 1,
    "platform": "twitter",
    "angle": "explainer",
    "content": "The CBN just raised interest rates to 18.5%...",
    "hook": "Interest rates just hit 18.5%. Here's what it means for your rent 🧵",
    "thread": [
      "1/ Higher interest rates = more expensive mortgages",
      "2/ This could push more people to renting instead of buying"
    ],
    "status": "pending",
    "generated_at": "2024-01-15T09:00:00Z",
    "trend_info": { /* trend object */ }
  }
]
```

#### Get Single Content Draft

**GET** `/content/{content_id}`

Get a single content draft by ID.

**Response:**
```json
{
  "id": 1,
  "platform": "twitter",
  "angle": "explainer",
  "content": "...",
  "status": "pending",
  "trend": { /* trend object */ }
}
```

#### Trigger Content Generation

**POST** `/content/generate`

Manually trigger content generation for top trends.

**Query Parameters:**
- `limit` (int, default: 5, max: 20): Number of trends to generate content for

**Response:**
```json
{
  "status": "success",
  "generated_count": 15
}
```

#### Approve/Reject/Edit Content

**POST** `/content/approve`

Approve, reject, or edit a content draft.

**Request Body:**
```json
{
  "content_id": 1,
  "action": "approve",  // or "reject" or "edit"
  "approved_by": "user@example.com",
  "edited_content": "Optional edited version...",
  "rejection_reason": "Optional reason for rejection"
}
```

**Response:**
```json
{
  "status": "success",
  "content_id": 1,
  "new_status": "approved"
}
```

#### Schedule Content

**POST** `/content/schedule`

Schedule or export approved content.

**Request Body:**
```json
{
  "content_id": 1,
  "scheduled_for": "2024-01-16T10:00:00Z",  // optional
  "export_to": "buffer"  // optional: buffer, publer, meta, copy
}
```

**Response:**
```json
{
  "status": "success",
  "export_data": {
    "platform": "twitter",
    "content": "...",
    "hook": "...",
    "thread": [...],
    "scheduled_for": "2024-01-16T10:00:00Z"
  }
}
```

---

### Configuration

#### Get All Config

**GET** `/config`

Get all configuration settings.

**Response:**
```json
{
  "keywords": ["real estate", "housing", "inflation", ...],
  "sensitive_topics": ["death", "tragedy", ...],
  "platforms_enabled": ["twitter", "linkedin", "instagram", "facebook"],
  "tone": "balanced"
}
```

#### Get Single Config

**GET** `/config/{key}`

Get a specific configuration value.

**Response:**
```json
{
  "key": "keywords",
  "value": ["real estate", "housing", ...],
  "description": "Keywords to track for relevance scoring"
}
```

#### Update Config

**POST** `/config`

Update or create a configuration setting.

**Request Body:**
```json
{
  "key": "keywords",
  "value": ["real estate", "housing", "inflation", "naira"],
  "updated_by": "admin@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "key": "keywords"
}
```

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding rate limiting to prevent abuse.

---

## Interactive Documentation

Visit `/docs` on your API server for interactive Swagger documentation where you can test all endpoints.

Example: `https://your-app.onrender.com/docs`
