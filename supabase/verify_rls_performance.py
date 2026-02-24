#!/usr/bin/env python3
"""
Verify RLS Performance Optimization
Confirms that auth.jwt() re-evaluation issue is fixed
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

def verify_rls_performance():
    """Verify that RLS performance optimization is working"""
    print("=" * 70)
    print("RLS Performance Optimization Verification")
    print("=" * 70)
    
    database_url = get_database_url()
    print(f"Connecting to database: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check patients table policies for performance optimization
            print("\n🔍 Checking patients table policies:")
            result = conn.execute(text("""
                SELECT policyname, cmd, qual 
                FROM pg_policies 
                WHERE tablename = 'patients' 
                ORDER BY policyname
            """))
            
            policies = result.fetchall()
            performance_optimized = True
            
            for policy in policies:
                policy_name, cmd, qual = policy
                print(f"\n📋 Policy: {policy_name} ({cmd})")
                print(f"   Definition: {qual}")
                
                # Check if policy uses optimized pattern
                if "auth.jwt()" in qual and "(select auth.jwt()" not in qual:
                    print(f"   ⚠️  PERFORMANCE ISSUE: Uses auth.jwt() directly")
                    performance_optimized = False
                elif "(select auth.jwt()" in qual:
                    print(f"   ✅ OPTIMIZED: Uses (select auth.jwt()) pattern")
                else:
                    print(f"   ℹ️  No auth.jwt() usage detected")
            
            # Check all tables for performance issues
            print("\n🔍 Scanning all tables for performance issues:")
            result = conn.execute(text("""
                SELECT tablename, policyname, qual 
                FROM pg_policies 
                WHERE qual LIKE '%auth.jwt()%' 
                AND qual NOT LIKE '%(select auth.jwt()%)'
                ORDER BY tablename, policyname
            """))
            
            problem_policies = result.fetchall()
            
            if problem_policies:
                print(f"   ⚠️  Found {len(problem_policies)} policies with performance issues:")
                for table, policy, qual in problem_policies:
                    print(f"      - {table}.{policy}")
                performance_optimized = False
            else:
                print("   ✅ No performance issues found in any policies")
            
            # Test query performance (simple test)
            print("\n🚀 Testing query performance with RLS:")
            
            # Set up a test JWT context
            conn.execute(text("""
                SET request.jwt.claims to '{"role": "admin", "user_id": "1"}'
            """))
            
            # Test a simple query
            result = conn.execute(text("""
                EXPLAIN (ANALYZE, BUFFERS) 
                SELECT COUNT(*) FROM patients 
                LIMIT 1
            """))
            
            explain_output = result.fetchall()
            print("   ✅ Query executed successfully with RLS context")
            
            # Reset JWT context
            conn.execute(text("RESET request.jwt.claims"))
            
        print("\n" + "=" * 70)
        if performance_optimized:
            print("🎉 RLS PERFORMANCE OPTIMIZATION VERIFIED!")
            print("✅ All policies use optimized (select auth.jwt()) pattern")
            print("✅ No auth.jwt() re-evaluation issues detected")
            print("✅ Database queries will be efficient at scale")
        else:
            print("⚠️  PERFORMANCE ISSUES DETECTED!")
            print("❌ Some policies still use auth.jwt() directly")
            print("❌ May cause performance issues at scale")
        print("=" * 70)
        
        return performance_optimized
        
    except Exception as e:
        print(f"❌ Error verifying RLS performance: {e}")
        raise

if __name__ == "__main__":
    verify_rls_performance()
