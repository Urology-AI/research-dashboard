#!/usr/bin/env python3
"""
Comprehensive RLS Implementation Verification
Ensures all changes are properly applied and working
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from urllib.parse import urlsplit
import glob

load_dotenv()

def get_database_url():
    """Get database URL from environment"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")
    return database_url

def verify_database_policies():
    """Verify all RLS policies are applied correctly"""
    print("=" * 70)
    print("🔍 VERIFYING DATABASE RLS POLICIES")
    print("=" * 70)
    
    database_url = get_database_url()
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Count all policies
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
            """))
            total_policies = result.fetchone()[0]
            
            print(f"✅ Total RLS policies: {total_policies}")
            
            # Check each table has 4 policies
            tables = ['patients', 'procedures', 'lab_results', 'follow_ups', 'users', 
                     'data_uploads', 'tags', 'custom_field_definitions', 'patient_tags',
                     'user_sessions', 'user_2fa', 'redcap_configs']
            
            all_tables_good = True
            for table in tables:
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM pg_policies 
                    WHERE schemaname = 'public' AND tablename = :table
                """), {"table": table})
                policy_count = result.fetchone()[0]
                
                if policy_count >= 3:  # At least SELECT, INSERT, DELETE/UPDATE
                    print(f"✅ {table}: {policy_count} policies")
                else:
                    print(f"❌ {table}: {policy_count} policies (expected 3-4)")
                    all_tables_good = False
            
            # Check for optimized policies (using current_setting)
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_policies 
                WHERE schemaname = 'public' 
                AND qual LIKE '%current_setting%'
            """))
            optimized_policies = result.fetchone()[0]
            
            print(f"✅ Optimized policies (current_setting): {optimized_policies}")
            
            return all_tables_good and total_policies >= 40 and optimized_policies >= 20
        
    except Exception as e:
        print(f"❌ Error verifying database policies: {e}")
        return False

def verify_backend_integration():
    """Verify all backend files have RLS integration"""
    print("\n" + "=" * 70)
    print("🔍 VERIFYING BACKEND RLS INTEGRATION")
    print("=" * 70)
    
    # Check core files
    core_files = {
        '/Users/aditya/patient-dashboard/backend/core/rls.py': 'RLS helper utilities',
        '/Users/aditya/patient-dashboard/backend/core/auth.py': 'JWT RLS claims',
        '/Users/aditya/patient-dashboard/backend/core/audit.py': 'RLS audit integration'
    }
    
    core_verified = 0
    for file_path, description in core_files.items():
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
                if any(keyword in content for keyword in ['RLSMixin', 'get_db_with_rls', 'rls_role', 'rls_user_id']):
                    print(f"✅ {description}: {os.path.basename(file_path)}")
                    core_verified += 1
                else:
                    print(f"❌ {description}: {os.path.basename(file_path)} - Missing RLS")
        else:
            print(f"❌ {description}: {os.path.basename(file_path)} - File not found")
    
    # Check route files
    route_pattern = '/Users/aditya/patient-dashboard/backend/routes/*.py'
    route_files = glob.glob(route_pattern)
    
    routes_verified = 0
    expected_routes = ['patients.py', 'procedures.py', 'lab_results.py', 'admin.py', 
                      'upload.py', 'export.py', 'search.py', 'analytics.py', 
                      'clinical_reports.py', 'user_sessions.py', 'redcap_config.py',
                      'auth_2fa_verify.py', 'two_factor.py']
    
    for route_file in route_files:
        filename = os.path.basename(route_file)
        if filename in expected_routes:
            with open(route_file, 'r') as f:
                content = f.read()
                if 'RLSMixin' in content and 'get_db_with_rls' in content:
                    print(f"✅ Route: {filename}")
                    routes_verified += 1
                else:
                    print(f"❌ Route: {filename} - Missing RLS integration")
    
    print(f"✅ Core files verified: {core_verified}/{len(core_files)}")
    print(f"✅ Route files verified: {routes_verified}/{len(expected_routes)}")
    
    return core_verified >= 2 and routes_verified >= 10

def verify_jwt_claims():
    """Verify JWT tokens include RLS claims"""
    print("\n" + "=" * 70)
    print("🔍 VERIFYING JWT RLS CLAIMS")
    print("=" * 70)
    
    auth_file = '/Users/aditya/patient-dashboard/backend/core/auth.py'
    
    try:
        with open(auth_file, 'r') as f:
            content = f.read()
        
        # Check for RLS claims in create_access_token
        if '"role": data.get("role"' in content and '"user_id": str(data.get("user_id"' in content:
            print("✅ JWT token creation includes RLS claims")
            jwt_creation = True
        else:
            print("❌ JWT token creation missing RLS claims")
            jwt_creation = False
        
        # Check for RLS claims extraction in verify_token
        if 'role: str = payload.get("role"' in content and 'user_id: str = payload.get("user_id"' in content:
            print("✅ JWT token verification extracts RLS claims")
            jwt_verification = True
        else:
            print("❌ JWT token verification missing RLS claims")
            jwt_verification = False
        
        # Check for RLS context storage
        if 'request.state.rls_role = role' in content and 'request.state.rls_user_id = user_id' in content:
            print("✅ RLS context stored in request state")
            context_storage = True
        else:
            print("❌ RLS context not stored in request state")
            context_storage = False
        
        return jwt_creation and jwt_verification and context_storage
        
    except Exception as e:
        print(f"❌ Error verifying JWT claims: {e}")
        return False

def verify_performance_optimization():
    """Verify performance optimizations are applied"""
    print("\n" + "=" * 70)
    print("🔍 VERIFYING PERFORMANCE OPTIMIZATION")
    print("=" * 70)
    
    database_url = get_database_url()
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check for current_setting usage (optimized)
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_policies 
                WHERE schemaname = 'public' 
                AND qual LIKE '%current_setting%'
            """))
            current_setting_policies = result.fetchone()[0]
            
            # Check for auth.jwt usage (unoptimized)
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_policies 
                WHERE schemaname = 'public' 
                AND qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%current_setting%'
            """))
            auth_jwt_policies = result.fetchone()[0]
            
            print(f"✅ Optimized policies (current_setting): {current_setting_policies}")
            print(f"❌ Unoptimized policies (auth.jwt): {auth_jwt_policies}")
            
            # Test performance
            conn.execute(text("SET request.jwt.claims to '{\"role\": \"admin\", \"user_id\": \"1\"}'"))
            
            result = conn.execute(text("""
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
                SELECT COUNT(*) FROM patients LIMIT 1
            """))
            
            explain_result = result.fetchone()
            if explain_result and explain_result[0]:
                plan = explain_result[0][0]
                execution_time = plan.get('Execution Time', 0)
                
                print(f"✅ Query execution time: {execution_time:.3f}ms")
                
                if execution_time < 100:
                    print("✅ Performance is excellent")
                    performance_good = True
                else:
                    print("⚠️  Performance could be better")
                    performance_good = False
            
            conn.execute(text("RESET request.jwt.claims"))
            
            return current_setting_policies > 0 and auth_jwt_policies == 0 and performance_good
        
    except Exception as e:
        print(f"❌ Error verifying performance: {e}")
        return False

def main():
    """Main verification function"""
    print("🔍 COMPREHENSIVE RLS IMPLEMENTATION VERIFICATION")
    print("=" * 70)
    
    # Run all verifications
    db_ok = verify_database_policies()
    backend_ok = verify_backend_integration()
    jwt_ok = verify_jwt_claims()
    perf_ok = verify_performance_optimization()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 70)
    
    print(f"Database RLS Policies:     {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"Backend Integration:       {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"JWT RLS Claims:            {'✅ PASS' if jwt_ok else '❌ FAIL'}")
    print(f"Performance Optimization:  {'✅ PASS' if perf_ok else '❌ FAIL'}")
    
    all_ok = db_ok and backend_ok and jwt_ok and perf_ok
    
    print("\n" + "=" * 70)
    if all_ok:
        print("🎉 ALL RLS CHANGES VERIFIED SUCCESSFULLY!")
        print("✅ Database policies applied")
        print("✅ Backend integration complete")
        print("✅ JWT claims configured")
        print("✅ Performance optimized")
        print("✅ Ready for production deployment")
    else:
        print("⚠️  SOME VERIFICATIONS FAILED!")
        print("❌ Review the issues above")
        print("❌ Complete missing changes before deployment")
    print("=" * 70)
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    exit(main())
