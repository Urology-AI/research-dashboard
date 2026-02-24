#!/usr/bin/env python3
"""
Run Splinter Linter on our Supabase Database
Validates RLS setup and performance optimizations
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

def run_splinter_linter():
    """Run Splinter linter to validate database setup"""
    print("=" * 70)
    print("Running Splinter Linter on Supabase Database")
    print("=" * 70)
    
    database_url = get_database_url()
    print(f"Database: {urlsplit(database_url).hostname}")
    
    try:
        # Read splinter SQL
        with open("splinter.sql", "r") as f:
            splinter_sql = f.read()
        
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            print("🔍 Running Splinter linter...")
            
            # Execute splinter linter
            result = conn.execute(text(splinter_sql))
            
            lints = result.fetchall()
            
            if not lints:
                print("✅ No lint issues found!")
                print("✅ Database configuration is optimal")
                return True
            
            print(f"\n📋 Found {len(lints)} lint issues:")
            print("=" * 50)
            
            # Group by level
            errors = []
            warnings = []
            info = []
            
            for lint in lints:
                name, title, level, facing, categories, description, detail, remediation, metadata, cache_key = lint
                
                lint_info = {
                    'name': name,
                    'title': title,
                    'detail': detail,
                    'remediation': remediation
                }
                
                if level == 'ERROR':
                    errors.append(lint_info)
                elif level == 'WARN':
                    warnings.append(lint_info)
                else:
                    info.append(lint_info)
            
            # Display results by severity
            if errors:
                print(f"\n🚨 ERRORS ({len(errors)}):")
                for error in errors:
                    print(f"   ❌ {error['title']}")
                    print(f"      {error['detail']}")
                    if error['remediation']:
                        print(f"      💡 {error['remediation']}")
                    print()
            
            if warnings:
                print(f"\n⚠️  WARNINGS ({len(warnings)}):")
                for warning in warnings:
                    print(f"   ⚠️  {warning['title']}")
                    print(f"      {warning['detail']}")
                    if warning['remediation']:
                        print(f"      💡 {warning['remediation']}")
                    print()
            
            if info:
                print(f"\nℹ️  INFO ({len(info)}):")
                for item in info:
                    print(f"   ℹ️  {item['title']}")
                    print(f"      {item['detail']}")
                    if item['remediation']:
                        print(f"      💡 {item['remediation']}")
                    print()
            
            # Check for RLS-specific issues
            rls_lints = [lint for lint in lints if 'rls' in lint[0].lower() or 'row level' in lint[4].__str__().lower()]
            
            if rls_lints:
                print(f"\n🔒 RLS-SPECIFIC ISSUES ({len(rls_lints)}):")
                for rls_lint in rls_lints:
                    name, title, level, facing, categories, description, detail, remediation, metadata, cache_key = rls_lint
                    print(f"   🔒 {title}")
                    print(f"      {detail}")
                    if remediation:
                        print(f"      💡 {remediation}")
                    print()
            else:
                print("\n✅ No RLS-specific issues detected!")
            
            # Performance-specific issues
            perf_lints = [lint for lint in lints if 'PERFORMANCE' in str(lint[4])]
            
            if perf_lints:
                print(f"\n⚡ PERFORMANCE ISSUES ({len(perf_lints)}):")
                for perf_lint in perf_lints:
                    name, title, level, facing, categories, description, detail, remediation, metadata, cache_key = perf_lint
                    print(f"   ⚡ {title}")
                    print(f"      {detail}")
                    if remediation:
                        print(f"      💡 {remediation}")
                    print()
            else:
                print("✅ No performance issues detected!")
            
            return len(errors) == 0  # Return True if no errors
        
    except Exception as e:
        print(f"❌ Error running Splinter linter: {e}")
        raise

def main():
    """Main function"""
    try:
        is_valid = run_splinter_linter()
        
        print("\n" + "=" * 70)
        if is_valid:
            print("🎉 SPLINTER VALIDATION PASSED!")
            print("✅ Database configuration is optimal")
            print("✅ No critical issues found")
        else:
            print("⚠️  SPLINTER FOUND ISSUES!")
            print("❌ Review the issues above for optimization")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Failed to run Splinter validation: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
