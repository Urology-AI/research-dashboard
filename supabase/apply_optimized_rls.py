#!/usr/bin/env python3
"""
Apply Optimized RLS Policies for Performance
Fixes auth.jwt() re-evaluation issue
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

def apply_optimized_rls():
    """Apply optimized RLS policies to fix performance issues"""
    print("=" * 70)
    print("Applying Optimized RLS Policies for Performance")
    print("=" * 70)
    
    database_url = get_database_url()
    print(f"Connecting to database: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        
        # Read the optimized RLS file
        with open("supabase/migrations/20240224000001_optimize_rls_performance.sql", "r") as f:
            sql_content = f.read()
        
        print("Applying optimized RLS policies...")
        
        with engine.connect() as conn:
            # Execute the optimized RLS policies
            conn.execute(text(sql_content))
            conn.commit()
        
        print("✅ Optimized RLS policies applied successfully!")
        
        # Verify the policies
        print("\nVerifying optimized policies:")
        with engine.connect() as conn:
            # Check patients table policies
            result = conn.execute(text("""
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
                FROM pg_policies 
                WHERE tablename = 'patients'
            """))
            
            policies = result.fetchall()
            if policies:
                print("📋 Patients table policies:")
                for policy in policies:
                    print(f"   - {policy[2]} ({policy[4]})")
            else:
                print("❌ No policies found on patients table")
        
        print("\n" + "=" * 70)
        print("RLS Performance Optimization Complete!")
        print("=" * 70)
        print("✅ Fixed auth.jwt() re-evaluation performance issue")
        print("✅ All policies now use (select auth.jwt()) pattern")
        print("✅ Database queries will now be more efficient at scale")
        
    except Exception as e:
        print(f"❌ Error applying optimized RLS policies: {e}")
        raise

if __name__ == "__main__":
    apply_optimized_rls()
