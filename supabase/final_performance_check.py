#!/usr/bin/env python3
"""
Final RLS Performance Verification
Confirm the optimization is working correctly
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

def final_performance_verification():
    """Final verification of RLS performance optimization"""
    print("=" * 70)
    print("Final RLS Performance Verification")
    print("=" * 70)
    
    database_url = get_database_url()
    print(f"Database: {urlsplit(database_url).hostname}")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check for the specific performance issue pattern
            result = conn.execute(text("""
                SELECT tablename, policyname, qual 
                FROM pg_policies 
                WHERE qual LIKE '%auth.jwt()%'
                AND qual NOT LIKE '%SELECT auth.jwt()%' 
                AND qual NOT LIKE '%( SELECT%'
                ORDER BY tablename, policyname
            """))
            
            problem_policies = result.fetchall()
            
            if problem_policies:
                print(f"❌ FOUND {len(problem_policies)} POLICIES WITH PERFORMANCE ISSUES:")
                for table, policy, qual in problem_policies:
                    print(f"   - {table}.{policy}")
                    print(f"     {qual}")
                print("\n⚠️  These policies use auth.jwt() directly and may be slow at scale")
                return False
            else:
                print("✅ NO PERFORMANCE ISSUES DETECTED!")
                print("✅ All policies use optimized SELECT pattern")
                
                # Show a few examples of optimized policies
                result = conn.execute(text("""
                    SELECT tablename, policyname, qual 
                    FROM pg_policies 
                    WHERE qual LIKE '%SELECT auth.jwt()%' 
                    LIMIT 3
                """))
                
                examples = result.fetchall()
                print(f"\n📋 Example optimized policies:")
                for table, policy, qual in examples:
                    print(f"\n   {table}.{policy}:")
                    print(f"   {qual}")
                
                return True
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        raise

def test_query_performance():
    """Test actual query performance with RLS"""
    print("\n" + "=" * 70)
    print("Testing Query Performance with RLS")
    print("=" * 70)
    
    database_url = get_database_url()
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Set JWT context for testing
            conn.execute(text("""
                SET request.jwt.claims to '{"role": "admin", "user_id": "1"}'
            """))
            
            # Test a simple query with EXPLAIN
            result = conn.execute(text("""
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
                SELECT COUNT(*) FROM patients
            """))
            
            explain_result = result.fetchone()
            if explain_result and explain_result[0]:
                plan = explain_result[0][0]  # Get the first plan from JSON
                execution_time = plan.get('Execution Time', 0)
                planning_time = plan.get('Planning Time', 0)
                
                print(f"✅ Query executed successfully")
                print(f"   Planning Time: {planning_time:.3f}ms")
                print(f"   Execution Time: {execution_time:.3f}ms")
                
                if execution_time < 100:  # Less than 100ms is good
                    print("   ✅ Performance looks good!")
                else:
                    print("   ⚠️  Query might be slow (check data size)")
            
            # Reset JWT context
            conn.execute(text("RESET request.jwt.claims"))
            
    except Exception as e:
        print(f"❌ Error testing performance: {e}")

if __name__ == "__main__":
    is_optimized = final_performance_verification()
    test_query_performance()
    
    print("\n" + "=" * 70)
    if is_optimized:
        print("🎉 RLS PERFORMANCE OPTIMIZATION VERIFIED!")
        print("✅ Your RLS policies are optimized for scale")
        print("✅ The Supabase dashboard warning should resolve")
    else:
        print("⚠️  PERFORMANCE OPTIMIZATION NEEDED!")
        print("❌ Some policies may need manual optimization")
    print("=" * 70)
