# Content Generation Guide

## 🎯 Overview

The content generation system now supports:
- ✅ Generate content for **ALL trends** (no filtering)
- ✅ Generate **multiple drafts per trend**
- ✅ Regenerate content for specific trends
- ✅ Bulk generation for entire database

---

## 📡 API Endpoints

### 1. Generate Content for Recent Trends

Generate content for the most recent N trends:

```bash
# Generate for 5 most recent trends
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate?limit=5"

# Generate for 10 most recent trends
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate?limit=10"

# Generate for 46 trends (all your current trends)
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate?limit=46"
```

**Response:**
```json
{
  "status": "success",
  "generated_count": 15
}
```

---

### 2. Generate Content for ALL Trends (Bulk)

Generate content for every trend in the database:

```bash
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/all"
```

**Features:**
- Processes all trends in batches of 10
- Automatic 2-second delay between batches to avoid rate limits
- Returns total count

**Response:**
```json
{
  "status": "success",
  "total_trends": 46,
  "generated_count": 138
}
```

**Note:** This generates 3 content pieces per trend (Twitter, LinkedIn, Instagram), so 46 trends = 138 content pieces.

---

### 3. Regenerate Content for Specific Trend

Generate new content drafts for a single trend (allows multiple drafts):

```bash
# Replace :trendId with actual trend ID (e.g., 1, 2, 3)
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/1"
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/3"
```

**Response:**
```json
{
  "status": "success",
  "trend_id": 1,
  "generated_count": 3
}
```

**Use Case:** If you don't like the first draft, regenerate to get new variations!

---

## 📋 View Generated Content

### Get All Content Drafts

```bash
curl "https://ue-content-intelligence.onrender.com/api/v1/content?limit=100"
```

### Filter by Status

```bash
# Pending content (not yet approved)
curl "https://ue-content-intelligence.onrender.com/api/v1/content?status=pending"

# Approved content
curl "https://ue-content-intelligence.onrender.com/api/v1/content?status=approved"

# Rejected content
curl "https://ue-content-intelligence.onrender.com/api/v1/content?status=rejected"
```

---

## ✏️ Edit Content Status

### Approve Content

```bash
# Replace :id with content draft ID
curl -X PUT "https://ue-content-intelligence.onrender.com/api/v1/content/1/approve"
```

### Reject Content

```bash
curl -X PUT "https://ue-content-intelligence.onrender.com/api/v1/content/2/reject"
```

---

## 🔄 Typical Workflow

### Step 1: Generate Content for All Trends

```bash
# Option A: Generate for all 46 trends at once
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/all"

# Option B: Generate in smaller batches
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate?limit=10"
```

### Step 2: Review Generated Content

```bash
curl "https://ue-content-intelligence.onrender.com/api/v1/content?status=pending&limit=50"
```

### Step 3: Approve or Reject

```bash
# Approve good content
curl -X PUT "https://ue-content-intelligence.onrender.com/api/v1/content/1/approve"
curl -X PUT "https://ue-content-intelligence.onrender.com/api/v1/content/5/approve"

# Reject bad content
curl -X PUT "https://ue-content-intelligence.onrender.com/api/v1/content/3/reject"
```

### Step 4: Regenerate if Needed

```bash
# If you rejected content for trend #3, generate new drafts
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/3"
```

### Step 5: Send Email Digest

```bash
# Send approved content via email
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/digest/send"
```

---

## 📊 Content Draft Structure

Each trend generates 3 content pieces:

```json
{
  "id": 1,
  "trend_id": 3,
  "platform": "twitter",
  "content_type": "post",
  "content": "🏠 Big news! Lagos Governor is partnering with private sector to tackle housing shortage...",
  "hashtags": ["#LagosHousing", "#RealEstate", "#Nigeria"],
  "status": "pending",
  "created_at": "2025-12-18T02:30:00.000Z"
}
```

**Platforms:**
- `twitter` - 280 characters max
- `linkedin` - 500 characters, professional tone
- `instagram` - 300 characters, with emojis

---

## ⚠️ Rate Limits

**OpenAI API:**
- If you hit a rate limit (HTTP 429), wait and retry.
- Keep generation batch sizes small (e.g. `limit=1` or `limit=2`) when testing.

**Tips:**
- Use `/generate/all` for bulk (has built-in delays)
- For manual generation, wait 2-3 seconds between requests
- Generate in batches of 10-20 trends at a time

---

## 🎨 Multiple Drafts Per Trend

You can generate multiple drafts for the same trend:

```bash
# First draft
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/1"

# Wait 5 seconds (avoid rate limit)
sleep 5

# Second draft (different variations)
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/1"

# Wait 5 seconds
sleep 5

# Third draft
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/1"
```

Now you have 9 content pieces for trend #1 (3 platforms × 3 drafts) to choose from!

---

## 🚀 Quick Start

Generate content for all 46 trends right now:

```bash
# Wait for Render to finish deploying, then run:
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/content/generate/all"

# This will take ~2-3 minutes and generate 138 content pieces
# (46 trends × 3 platforms = 138 drafts)
```

---

## 📧 Email Digest

Once you have approved content:

```bash
# Send digest with approved content
curl -X POST "https://ue-content-intelligence.onrender.com/api/v1/digest/send"
```

The digest will include:
- All pending content drafts
- Organized by platform (Twitter, LinkedIn, Instagram)
- Source trend information
- Relevance scores and keywords

---

**Happy content creating! 🎉**
