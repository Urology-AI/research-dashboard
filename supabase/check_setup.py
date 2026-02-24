#!/usr/bin/env python3
"""
Quick check to verify your Supabase setup is ready for RLS.
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from urllib.parse import urlsplit

load_dotenv()

def check_supabase_setup():
    """Check if Supabase is properly configured"""
    print("🔍 Checking Supabase setup...")
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    if "supabase" not in database_url.lower():
        print("⚠️  DATABASE_URL doesn't appear to be a Supabase URL")
        print(f"   Current URL: {urlsplit(database_url).hostname}")
        return False
    
    print(f"✅ DATABASE_URL found: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Check if tables exist
            result = conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY tablename
            """))
            tables = [row[0] for row in result.fetchall()]
            
            expected_tables = [
                'patients', 'procedures', 'lab_results', 'follow_ups', 
                'users', 'data_uploads', 'tags', 'user_sessions'
            ]
            
            missing_tables = []
            for table in expected_tables:
                if table in tables:
                    print(f"✅ Table '{table}' exists")
                else:
                    print(f"❌ Table '{table}' missing")
                    missing_tables.append(table)
            
            if missing_tables:
                print(f"\n⚠️  Missing tables: {', '.join(missing_tables)}")
                print("   Run database migrations first")
                return False
            
            # Check current RLS status
            print("\n🔒 Current RLS status:")
            result = conn.execute(text("""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' AND tablename IN ('patients', 'procedures', 'lab_results', 'users')
                ORDER BY tablename
            """))
            
            rls_disabled = []
            for row in result.fetchall():
                table, has_rls = row
                if has_rls:
                    print(f"✅ {table}: RLS enabled")
                else:
                    print(f"❌ {table}: RLS disabled")
                    rls_disabled.append(table)
            
            if rls_disabled:
                print(f"\n📋 RLS needs to be enabled on: {', '.join(rls_disabled)}")
                print("   Run: python supabase/setup_rls.py")
            else:
                print("\n✅ RLS is already enabled on all tables!")
            
            return True
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def main():
    print("=" * 50)
    print("Supabase RLS Readiness Check")
    print("=" * 50)
    
    if check_supabase_setup():
        print("\n✅ Setup check completed!")
    else:
        print("\n❌ Setup check failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
