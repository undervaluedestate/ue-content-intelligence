#!/usr/bin/env python3
"""
Quick script to test your Supabase database connection.
Run: python test_db_connection.py
"""

import sys
from app.core.config import settings
from sqlalchemy import create_engine, text

def test_connection():
    """Test database connection."""
    print("🔍 Testing Supabase database connection...")
    print(f"📍 Database URL: {settings.DATABASE_URL[:50]}...")
    
    try:
        # Create engine
        engine = create_engine(settings.DATABASE_URL)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            
            print("✅ Connection successful!")
            print(f"📊 PostgreSQL version: {version[:50]}...")
            
            # Test if we can create tables
            conn.execute(text("SELECT 1"))
            print("✅ Can execute queries!")
            
            return True
            
    except Exception as e:
        print("❌ Connection failed!")
        print(f"Error: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Check your DATABASE_URL in .env file")
        print("2. Make sure you replaced [YOUR-PASSWORD] with actual password")
        print("3. Verify your Supabase project is active")
        print("4. Try resetting your database password in Supabase dashboard")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
