#!/bin/bash

# Content Intelligence System - Complete Setup Script
# This script sets up both backend and frontend for local development

set -e  # Exit on error

echo "=========================================="
echo "Content Intelligence System - Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

echo ""
echo "=========================================="
echo "Backend Setup"
echo "=========================================="
echo ""

# Backend setup
cd backend

echo "Creating Python virtual environment..."
python3 -m venv venv
echo -e "${GREEN}✓ Virtual environment created${NC}"

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit backend/.env with your API keys${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Initialize database
echo "Initializing database..."
python scripts/init_db.py
echo -e "${GREEN}✓ Database initialized${NC}"

# Seed test data
echo "Seeding test data..."
python scripts/seed_test_data.py
echo -e "${GREEN}✓ Test data seeded${NC}"

# Run health check
echo "Running health check..."
python scripts/health_check.py || echo -e "${YELLOW}⚠ Some services not configured (this is OK for local dev)${NC}"

cd ..

echo ""
echo "=========================================="
echo "Frontend Setup"
echo "=========================================="
echo ""

# Frontend setup
cd frontend

echo "Installing Node.js dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file from template..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✓ .env.local created${NC}"
else
    echo -e "${GREEN}✓ .env.local file already exists${NC}"
fi

cd ..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit backend/.env with your API keys:"
echo "   - OPENAI_API_KEY (required)"
echo "   - TWITTER_BEARER_TOKEN (optional)"
echo "   - RESEND_API_KEY (optional)"
echo ""
echo "2. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Open your browser:"
echo "   Dashboard: http://localhost:3000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo -e "${GREEN}Happy content creating! 🚀${NC}"
echo ""
