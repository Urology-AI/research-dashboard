#!/usr/bin/env python3
"""
RLS Integration Checker
Analyzes the codebase to identify files that need RLS integration
"""
import os
import re
from pathlib import Path
from typing import List, Dict, Set

def find_database_query_files(base_dir: Path) -> List[Path]:
    """Find files that contain database queries"""
    db_files = []
    
    # Look for Python files with database operations
    for py_file in base_dir.rglob("*.py"):
        if "test" in py_file.name.lower() or "__pycache__" in str(py_file):
            continue
            
        try:
            content = py_file.read_text(encoding='utf-8')
            # Check for database operations
            if any(pattern in content for pattern in [
                "db.query(", "session.query(", "SessionLocal()", 
                ".add(", ".commit()", ".delete(", ".filter(",
                "from sqlalchemy", "from models import"
            ]):
                db_files.append(py_file)
        except Exception:
            continue
    
    return db_files

def analyze_rls_needs(file_path: Path) -> Dict[str, Set[str]]:
    """Analyze a file for RLS integration needs"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return {}
    
    needs = {
        "imports": set(),
        "rls_context": set(),
        "permission_checks": set(),
        "auth_updates": set()
    }
    
    # Check if RLS is already integrated
    if "from core.rls import" in content or "RLSMixin" in content:
        return needs  # Already has RLS
    
    # Check for database queries that need RLS
    if re.search(r'db\.query\(|session\.query\(', content):
        needs["rls_context"].add("RLSMixin.get_db_with_rls(request, db)")
    
    # Check for route definitions that need permission checks
    if re.search(r'@router\.(get|post|put|delete|patch)', content):
        # Look for model operations
        models = re.findall(r'query\((\w+)', content)
        for model in models:
            if model in ['Patient', 'Procedure', 'LabResult', 'FollowUp', 'User']:
                needs["permission_checks"].add(f"RLSMixin.check_rls_permissions(request, 'clinician')")
    
    # Check for imports that need RLS
    if re.search(r'from (core\.auth|fastapi).*import.*Request', content):
        needs["imports"].add("from core.rls import RLSMixin")
    
    # Check if this is an auth-related file
    if "auth.py" in file_path.name or "login" in content:
        needs["auth_updates"].add("create_access_token with RLS claims")
    
    return needs

def main():
    """Main analysis function"""
    base_dir = Path(__file__).parent.parent
    print("=" * 70)
    print("RLS Integration Analysis")
    print("=" * 70)
    
    # Find all files with database operations
    db_files = find_database_query_files(base_dir / "backend")
    
    print(f"\nFound {len(db_files)} files with database operations")
    
    # Analyze each file
    files_needing_updates = []
    for file_path in db_files:
        needs = analyze_rls_needs(file_path)
        if any(needs.values()):
            files_needing_updates.append((file_path, needs))
    
    print(f"\n{len(files_needing_updates)} files need RLS integration:")
    
    # Group by type of changes needed
    import os
    from collections import defaultdict
    
    change_summary = defaultdict(list)
    
    for file_path, needs in files_needing_updates:
        rel_path = file_path.relative_to(base_dir)
        
        if needs["imports"]:
            change_summary["Need RLS imports"].append(rel_path)
        if needs["rls_context"]:
            change_summary["Need RLS context setting"].append(rel_path)
        if needs["permission_checks"]:
            change_summary["Need permission checks"].append(rel_path)
        if needs["auth_updates"]:
            change_summary["Need auth token updates"].append(rel_path)
    
    for change_type, files in change_summary.items():
        print(f"\n📋 {change_type}:")
        for file_path in files:
            print(f"   - {file_path}")
    
    # Detailed recommendations
    print(f"\n" + "=" * 70)
    print("DETAILED RECOMMENDATIONS")
    print("=" * 70)
    
    print("\n1. IMMEDIATE (High Priority):")
    print("   - Update auth.py login endpoint to include RLS claims ✅ (Done)")
    print("   - Update core/auth.py to set RLS context ✅ (Done)")
    print("   - Add RLS to patient routes ✅ (Done)")
    
    print("\n2. REQUIRED (Medium Priority):")
    print("   - Add RLS to all routes with database operations:")
    required_files = change_summary.get("Need RLS context setting", [])
    for file_path in required_files[:5]:  # Show first 5
        print(f"     • {file_path}")
    if len(required_files) > 5:
        print(f"     • ... and {len(required_files) - 5} more files")
    
    print("\n3. RECOMMENDED (Low Priority):")
    print("   - Add role-based permission checks to sensitive operations")
    print("   - Add RLS unit tests")
    print("   - Update API documentation with RLS information")
    
    print("\n4. TESTING:")
    print("   - Test RLS policies with different user roles")
    print("   - Verify JWT tokens contain correct claims")
    print("   - Test database access restrictions")
    
    # Create a checklist
    print(f"\n" + "=" * 70)
    print("RLS INTEGRATION CHECKLIST")
    print("=" * 70)
    
    checklist = [
        ("✅", "Create RLS policies in Supabase"),
        ("✅", "Update JWT token creation with RLS claims"),
        ("✅", "Update auth middleware to set RLS context"),
        ("✅", "Create RLS helper utilities"),
        ("✅", "Update patient routes with RLS"),
        ("⏳", "Update procedure routes with RLS"),
        ("⏳", "Update lab result routes with RLS"),
        ("⏳", "Update user management routes with RLS"),
        ("⏳", "Update file upload routes with RLS"),
        ("⏳", "Add role-based permission checks"),
        ("⏳", "Test RLS with different user roles"),
        ("⏳", "Update API documentation"),
    ]
    
    for status, item in checklist:
        print(f"   {status} {item}")
    
    print(f"\nTotal files needing updates: {len(files_needing_updates)}")
    print("Estimated effort: 2-4 hours for full integration")

if __name__ == "__main__":
    main()
