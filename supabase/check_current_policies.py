#!/usr/bin/env python3
"""
Check Current RLS Policies
See what's actually applied in the database
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from urllib.parse import urlsplit

load_dotenv()

def get_database_url():
    """Get database URL from environment"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")
    return database_url

def check_current_policies():
    """Check what RLS policies are currently applied"""
    print("=" * 70)
    print("Current RLS Policies in Database")
    print("=" * 70)
    
    database_url = get_database_url()
    print(f"Connecting to database: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Get all policies
            result = conn.execute(text("""
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
                FROM pg_policies 
                WHERE schemaname = 'public'
                ORDER BY tablename, policyname
            """))
            
            policies = result.fetchall()
            
            if not policies:
                print("❌ No RLS policies found in database")
                return
            
            print(f"\nFound {len(policies)} RLS policies:\n")
            
            current_table = None
            for policy in policies:
                schema, table, name, permissive, roles, cmd, qual = policy
                
                if table != current_table:
                    print(f"\n📋 Table: {table}")
                    print("=" * 40)
                    current_table = table
                
                print(f"   Policy: {name}")
                print(f"   Command: {cmd}")
                print(f"   Roles: {roles}")
                if qual:
                    print(f"   Qual: {qual}")
                    
                    # Check for performance issues
                    if "auth.jwt()" in qual and "(select auth.jwt()" not in qual:
                        print(f"   ⚠️  PERFORMANCE ISSUE: Uses auth.jwt() directly")
                    elif "(select auth.jwt()" in qual:
                        print(f"   ✅ OPTIMIZED: Uses (select auth.jwt()) pattern")
                else:
                    print(f"   Qual: None (no qualification)")
                print()
        
        print("=" * 70)
        print("Policy check completed")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error checking policies: {e}")
        raise

if __name__ == "__main__":
    check_current_policies()
