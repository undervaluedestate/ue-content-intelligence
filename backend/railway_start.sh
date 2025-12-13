#!/bin/bash

echo "🚀 Starting Content Intelligence System..."

# Decode Gmail credentials from environment variables if they exist
if [ ! -z "$GMAIL_CREDENTIALS_B64" ]; then
    echo "📧 Decoding Gmail credentials..."
    echo "$GMAIL_CREDENTIALS_B64" | base64 -d > credentials.json
    echo "✓ Gmail credentials decoded"
else
    echo "⚠ GMAIL_CREDENTIALS_B64 not set, skipping credentials decode"
fi

if [ ! -z "$GMAIL_TOKEN_B64" ]; then
    echo "🔑 Decoding Gmail token..."
    echo "$GMAIL_TOKEN_B64" | base64 -d > token.pickle
    echo "✓ Gmail token decoded"
else
    echo "⚠ GMAIL_TOKEN_B64 not set, skipping token decode"
fi

# Check if credentials files exist
if [ -f "credentials.json" ]; then
    echo "✓ credentials.json found"
else
    echo "⚠ credentials.json not found"
fi

if [ -f "token.pickle" ]; then
    echo "✓ token.pickle found"
else
    echo "⚠ token.pickle not found"
fi

# Start the application
echo "🎯 Starting FastAPI application..."
uvicorn main:app --host 0.0.0.0 --port $PORT
