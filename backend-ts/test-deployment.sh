#!/bin/bash

# Test script for deployed TypeScript backend
# Usage: ./test-deployment.sh <BACKEND_URL>

BACKEND_URL="${1:-https://content-intelligence-ts.onrender.com}"

echo "🧪 Testing TypeScript Backend Deployment"
echo "URL: $BACKEND_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
HEALTH=$(curl -s "$BACKEND_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH" | python3 -m json.tool
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "$HEALTH"
    exit 1
fi
echo ""

# Test 2: Stats (should work even with no data)
echo "2️⃣  Testing Stats Endpoint..."
STATS=$(curl -s "$BACKEND_URL/api/v1/stats")
if echo "$STATS" | grep -q "trends"; then
    echo -e "${GREEN}✅ Stats endpoint working${NC}"
    echo "$STATS" | python3 -m json.tool
else
    echo -e "${RED}❌ Stats endpoint failed${NC}"
    echo "$STATS"
fi
echo ""

# Test 3: Ingest Trends
echo "3️⃣  Testing Trend Ingestion..."
echo -e "${YELLOW}⏳ Ingesting trends (may take 30-60 seconds)...${NC}"
INGEST=$(curl -s -X POST "$BACKEND_URL/api/v1/trends/ingest")
if echo "$INGEST" | grep -q "success"; then
    echo -e "${GREEN}✅ Ingestion successful${NC}"
    echo "$INGEST" | python3 -m json.tool
else
    echo -e "${RED}❌ Ingestion failed${NC}"
    echo "$INGEST"
fi
echo ""

# Test 4: Score Trends
echo "4️⃣  Testing Trend Scoring..."
SCORE=$(curl -s -X POST "$BACKEND_URL/api/v1/trends/score")
if echo "$SCORE" | grep -q "success"; then
    echo -e "${GREEN}✅ Scoring successful${NC}"
    echo "$SCORE" | python3 -m json.tool
else
    echo -e "${RED}❌ Scoring failed${NC}"
    echo "$SCORE"
fi
echo ""

# Test 5: Check Updated Stats
echo "5️⃣  Checking Updated Stats..."
STATS2=$(curl -s "$BACKEND_URL/api/v1/stats")
echo "$STATS2" | python3 -m json.tool
echo ""

# Test 6: Get Relevant Trends
echo "6️⃣  Getting Relevant Trends (min_relevance=40)..."
TRENDS=$(curl -s "$BACKEND_URL/api/v1/trends?min_relevance=40&limit=5")
if echo "$TRENDS" | grep -q "\["; then
    echo -e "${GREEN}✅ Trends endpoint working${NC}"
    echo "$TRENDS" | python3 -m json.tool | head -50
else
    echo -e "${RED}❌ Trends endpoint failed${NC}"
    echo "$TRENDS"
fi
echo ""

# Test 7: Generate Content (with rate limit warning)
echo "7️⃣  Testing Content Generation..."
echo -e "${YELLOW}⏳ Waiting 10 seconds to avoid OpenAI API rate limit...${NC}"
sleep 10
CONTENT_GEN=$(curl -s -X POST "$BACKEND_URL/api/v1/content/generate?limit=2")
if echo "$CONTENT_GEN" | grep -q "success"; then
    echo -e "${GREEN}✅ Content generation successful${NC}"
    echo "$CONTENT_GEN" | python3 -m json.tool
else
    echo -e "${RED}❌ Content generation failed${NC}"
    echo "$CONTENT_GEN"
fi
echo ""

# Test 8: View Generated Content
echo "8️⃣  Viewing Generated Content..."
CONTENT=$(curl -s "$BACKEND_URL/api/v1/content?status=pending&limit=5")
if echo "$CONTENT" | grep -q "\["; then
    echo -e "${GREEN}✅ Content endpoint working${NC}"
    echo "$CONTENT" | python3 -m json.tool | head -100
else
    echo -e "${YELLOW}⚠️  No content found (may be expected)${NC}"
    echo "$CONTENT"
fi
echo ""

echo "🎉 Testing Complete!"
echo ""
echo "Summary:"
echo "- Backend URL: $BACKEND_URL"
echo "- All core endpoints tested"
echo "- Check output above for any failures"
