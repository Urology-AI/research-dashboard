#!/usr/bin/env python3
"""
Deployment preflight check.

Validates database connectivity, schema presence, and CRUD capability.
Exits non-zero on failure so deployment stops early.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))

    from core.db_migration import migrate_database
    from core.preflight import run_startup_preflight

    # Run migrations first, then preflight will auto-create any missing tables.
    migrate_database()

    report = run_startup_preflight(strict=False)
    print(json.dumps(report, indent=2))

    if not report.get("ready", False):
        print("Preflight failed. Deployment halted.", file=sys.stderr)
        return 1

    print("Preflight passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
