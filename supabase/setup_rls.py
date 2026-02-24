#!/usr/bin/env python3
"""
Script to apply RLS policies to Supabase database.
Run this script to enable Row Level Security on your Supabase instance.
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

def get_database_url():
    """Get Supabase database URL from environment"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return None
    
    # Check if it's a Supabase URL
    if "supabase" not in database_url.lower():
        print("WARNING: DATABASE_URL doesn't appear to be a Supabase URL")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            return None
    
    return database_url

def apply_rls_policies():
    """Apply RLS policies to the database"""
    database_url = get_database_url()
    if not database_url:
        return False
    
    print(f"Connecting to database: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        
        # Read the RLS migration file
        migration_file = Path(__file__).parent / "migrations" / "20240224000000_enable_rls.sql"
        if not migration_file.exists():
            print(f"ERROR: Migration file not found: {migration_file}")
            return False
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        print("Applying RLS policies...")
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            try:
                # Execute the RLS policies
                conn.execute(text(sql_content))
                trans.commit()
                print("✅ RLS policies applied successfully!")
                return True
            except Exception as e:
                trans.rollback()
                print(f"❌ Error applying RLS policies: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def verify_rls_enabled():
    """Verify that RLS is enabled on tables"""
    database_url = get_database_url()
    if not database_url:
        return False
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if RLS is enabled on key tables
            tables_to_check = [
                'patients', 'procedures', 'lab_results', 
                'follow_ups', 'users', 'data_uploads'
            ]
            
            print("\nVerifying RLS status:")
            for table in tables_to_check:
                try:
                    result = conn.execute(text(f"""
                        SELECT rowsecurity, tablename 
                        FROM pg_tables 
                        WHERE schemaname = 'public' AND tablename = '{table}'
                    """))
                    row = result.fetchone()
                    if row and row.rowsecurity:
                        print(f"✅ {table}: RLS enabled")
                    else:
                        print(f"❌ {table}: RLS not enabled")
                except Exception as e:
                    print(f"⚠️  {table}: Could not verify - {e}")
            
            # Check if policies exist
            print("\nChecking RLS policies:")
            result = conn.execute(text("""
                SELECT schemaname, tablename, policyname 
                FROM pg_policies 
                WHERE schemaname = 'public'
                ORDER BY tablename, policyname
            """))
            
            policies = result.fetchall()
            if policies:
                for policy in policies:
                    print(f"📋 {policy.tablename}: {policy.policyname}")
            else:
                print("❌ No RLS policies found")
            
            return True
            
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    print("=" * 60)
    print("Supabase RLS Setup Script")
    print("=" * 60)
    
    if not apply_rls_policies():
        sys.exit(1)
    
    if not verify_rls_enabled():
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("RLS setup completed successfully!")
    print("Your database now has row-level security enabled.")
    print("=" * 60)

if __name__ == "__main__":
    main()
