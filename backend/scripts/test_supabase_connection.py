#!/usr/bin/env python3
"""
Interactive Supabase connectivity tester.

Use this script to validate:
1) Supabase project URL reachability
2) PostgreSQL connection URL
3) Supabase Storage bucket access (optional)
"""
from __future__ import annotations

import getpass
import importlib
import json
from dataclasses import dataclass
from typing import List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import quote, urlsplit, urlunsplit
from uuid import uuid4

DEFAULT_BUCKET = "research-dashboard-storage"


@dataclass
class TestResult:
    name: str
    ok: bool
    details: str


def prompt_value(label: str, default: Optional[str] = None, secret: bool = False) -> str:
    hint = f" [{default}]" if default else ""
    prompt = f"{label}{hint}: "
    value = getpass.getpass(prompt) if secret else input(prompt)
    return value.strip() or (default or "")


def normalize_database_url(db_url: str) -> str:
    url = db_url.strip()
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    if "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


def mask_database_url(db_url: str) -> str:
    parts = urlsplit(db_url)
    if "@" not in parts.netloc:
        return db_url
    creds, host = parts.netloc.rsplit("@", 1)
    if ":" in creds:
        user, _ = creds.split(":", 1)
        masked_netloc = f"{user}:****@{host}"
    else:
        masked_netloc = f"{creds}@{host}"
    return urlunsplit((parts.scheme, masked_netloc, parts.path, parts.query, parts.fragment))


def test_project_url(supabase_url: str, api_key: str = "") -> TestResult:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/"
    req = urlrequest.Request(endpoint, method="GET")
    req.add_header("Accept", "application/json")
    if api_key:
        req.add_header("apikey", api_key)
        req.add_header("Authorization", f"Bearer {api_key}")

    try:
        with urlrequest.urlopen(req, timeout=12) as resp:
            return TestResult(
                name="Project URL",
                ok=True,
                details=f"Reachable ({resp.status})",
            )
    except urlerror.HTTPError as exc:
        # 401/404 still means the endpoint is reachable.
        if exc.code in (401, 404):
            return TestResult(
                name="Project URL",
                ok=True,
                details=f"Reachable (HTTP {exc.code})",
            )
        return TestResult(
            name="Project URL",
            ok=False,
            details=f"HTTP {exc.code}: {exc.reason}",
        )
    except Exception as exc:  # noqa: BLE001
        return TestResult(name="Project URL", ok=False, details=str(exc))


def test_database_url(db_url: str) -> TestResult:
    try:
        sqlalchemy = importlib.import_module("sqlalchemy")
        create_engine = sqlalchemy.create_engine
        text = sqlalchemy.text
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            version = conn.execute(text("SELECT version()")).scalar()
            database = conn.execute(text("SELECT current_database()")).scalar()
        version_str = str(version).split(" ")[0] if version else "unknown"
        return TestResult(
            name="Database URL",
            ok=True,
            details=f"Connected to '{database}' ({version_str})",
        )
    except Exception as exc:  # noqa: BLE001
        hint = database_error_hint(db_url, str(exc))
        details = str(exc)
        if hint:
            details = f"{details}\nHint: {hint}"
        return TestResult(name="Database URL", ok=False, details=details)


def test_storage_bucket(supabase_url: str, service_role_key: str, bucket: str) -> TestResult:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }
    list_url = f"{supabase_url.rstrip('/')}/storage/v1/bucket"

    try:
        status, payload = http_request(list_url, headers=headers, timeout=15)
        if status not in (200, 204):
            return TestResult(
                name="Storage Bucket",
                ok=False,
                details=f"Bucket list failed (HTTP {status})",
            )

        buckets = json.loads(payload.decode("utf-8") or "[]")
        bucket_names = {
            b.get("name", "")
            for b in buckets
            if isinstance(b, dict) and b.get("name")
        }
        if bucket not in bucket_names:
            found_names = ", ".join(sorted(bucket_names)[:10]) or "none"
            return TestResult(
                name="Storage Bucket",
                ok=False,
                details=f"Bucket '{bucket}' not found (found: {found_names})",
            )

        probe_path = f"_preflight/{uuid4().hex}.txt"
        object_path = quote(f"{bucket}/{probe_path}", safe="/")
        object_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{object_path}"

        upload_headers = {
            **headers,
            "Content-Type": "text/plain",
            "x-upsert": "false",
        }
        upload_status, _ = http_request(
            object_url,
            method="POST",
            headers=upload_headers,
            body=b"supabase storage probe",
            timeout=20,
        )
        if upload_status not in (200, 201):
            return TestResult(
                name="Storage Bucket",
                ok=False,
                details=f"Upload probe failed (HTTP {upload_status})",
            )

        delete_status, _ = http_request(
            object_url,
            method="DELETE",
            headers=headers,
            timeout=20,
        )
        if delete_status not in (200, 204):
            return TestResult(
                name="Storage Bucket",
                ok=False,
                details=f"Delete probe failed (HTTP {delete_status})",
            )

        return TestResult(
            name="Storage Bucket",
            ok=True,
            details=f"Upload/delete probe succeeded for '{bucket}'",
        )
    except urlerror.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8")
        except Exception:  # noqa: BLE001
            body = exc.reason if hasattr(exc, "reason") else ""
        return TestResult(
            name="Storage Bucket",
            ok=False,
            details=f"HTTP {exc.code}: {body or exc.reason}",
        )
    except Exception as exc:  # noqa: BLE001
        return TestResult(name="Storage Bucket", ok=False, details=str(exc))


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[dict[str, str]] = None,
    body: Optional[bytes] = None,
    timeout: int = 12,
) -> tuple[int, bytes]:
    req = urlrequest.Request(url, data=body, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urlrequest.urlopen(req, timeout=timeout) as response:
        return response.status, response.read()


def database_error_hint(db_url: str, error_message: str) -> str:
    msg = error_message.lower()
    parts = urlsplit(db_url)
    host = (parts.hostname or "").lower()
    username = parts.username or ""

    if "password authentication failed" in msg:
        if host.endswith("pooler.supabase.com") and username == "postgres":
            return (
                "Supabase pooler URLs require username format "
                "'postgres.<project_ref>' (not plain 'postgres'). Also URL-encode "
                "password special characters."
            )
        return (
            "Verify database password is correct and URL-encoded. Common characters "
            "that must be encoded include @, :, /, ?, #, %, and &."
        )

    if "could not translate host name" in msg:
        return "Host looks invalid. Re-copy the full host from Supabase connection settings."

    if "ssl" in msg and "required" in msg:
        return "Ensure the URL includes '?sslmode=require' (this script auto-adds it)."

    return ""


def print_result(result: TestResult) -> None:
    icon = "PASS" if result.ok else "FAIL"
    print(f"[{icon}] {result.name}: {result.details}")


def main() -> int:
    print("=" * 72)
    print("Supabase Connectivity Tester")
    print("=" * 72)
    print("Paste values from Supabase/Render to validate before production deploy.\n")

    supabase_url = prompt_value("Supabase URL (https://<ref>.supabase.co)")
    db_url_raw = prompt_value(
        "Database URL (pooler/direct URL from Supabase, paste full URI)"
    )
    service_role_key = prompt_value(
        "Supabase service_role key (optional for storage check)",
        secret=True,
    )
    bucket = prompt_value("Storage bucket", default=DEFAULT_BUCKET)

    if not supabase_url and not db_url_raw:
        print("No inputs provided. Nothing to test.")
        return 1

    results: List[TestResult] = []

    if supabase_url:
        results.append(test_project_url(supabase_url, service_role_key))

    if db_url_raw:
        db_url = normalize_database_url(db_url_raw)
        print(f"\nTesting DB URL: {mask_database_url(db_url)}")
        results.append(test_database_url(db_url))

    if supabase_url and service_role_key:
        results.append(test_storage_bucket(supabase_url, service_role_key, bucket))
    else:
        print("\nSkipping storage check (missing Supabase URL or service_role key).")

    print("\n" + "-" * 72)
    for result in results:
        print_result(result)
    print("-" * 72)

    failed = [r for r in results if not r.ok]
    if failed:
        print(f"{len(failed)} check(s) failed.")
        return 1

    print("All checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
