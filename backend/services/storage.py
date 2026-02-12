"""
Supabase Storage helpers for file persistence.
"""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4


def get_storage_config() -> Dict[str, Any]:
    """Return storage configuration and requirement flags."""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    required_default = "true" if environment == "production" else "false"

    config = {
        "url": os.getenv("SUPABASE_URL", "").strip(),
        "service_role_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        "bucket": os.getenv("SUPABASE_STORAGE_BUCKET", "research-dashboard-storage").strip(),
        "required": os.getenv("SUPABASE_STORAGE_REQUIRED", required_default).lower() == "true",
    }
    config["configured"] = bool(config["url"] and config["service_role_key"] and config["bucket"])
    return config


def _sanitize_filename(filename: str) -> str:
    """Sanitize filenames for object storage paths."""
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", filename or "upload.bin")
    return safe.strip("._") or "upload.bin"


def _get_supabase_client():
    """Create a Supabase admin client using service-role credentials."""
    config = get_storage_config()
    if not config["configured"]:
        raise RuntimeError("Supabase storage is not configured")

    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError(
            "Supabase client not installed. Add dependency: supabase"
        ) from exc

    return create_client(config["url"], config["service_role_key"])


def upload_bytes_to_supabase_storage(
    content: bytes,
    filename: str,
    *,
    folder: str = "uploads",
    content_type: Optional[str] = None,
) -> Dict[str, str]:
    """
    Upload bytes content to Supabase storage and return bucket/path metadata.
    """
    if not isinstance(content, (bytes, bytearray)) or len(content) == 0:
        raise RuntimeError("Upload content is empty")

    config = get_storage_config()
    if not config["configured"]:
        raise RuntimeError("Supabase storage is not configured")

    client = _get_supabase_client()
    safe_filename = _sanitize_filename(filename)
    date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
    object_path = f"{folder}/{date_prefix}/{uuid4().hex}_{safe_filename}"

    file_options = {
        "upsert": "false",
        "content-type": content_type or "application/octet-stream",
    }
    client.storage.from_(config["bucket"]).upload(object_path, content, file_options=file_options)

    return {
        "bucket": config["bucket"],
        "path": object_path,
    }


def delete_from_supabase_storage(path: str) -> None:
    """Delete an object from configured Supabase bucket."""
    if not path:
        return
    config = get_storage_config()
    if not config["configured"]:
        return
    client = _get_supabase_client()
    client.storage.from_(config["bucket"]).remove([path])


def run_storage_preflight_check() -> Dict[str, Any]:
    """
    Verify storage configuration and write/delete capability.
    """
    config = get_storage_config()
    report: Dict[str, Any] = {
        "configured": config["configured"],
        "required": config["required"],
        "bucket": config["bucket"],
        "ok": False,
        "details": "",
        "probe_path": None,
    }

    if not config["configured"]:
        report["ok"] = not config["required"]
        report["details"] = (
            "Supabase storage not configured"
            if config["required"]
            else "Supabase storage skipped in non-required mode"
        )
        return report

    probe_content = b"storage preflight probe"
    probe_name = "preflight.txt"
    try:
        upload_meta = upload_bytes_to_supabase_storage(
            probe_content,
            probe_name,
            folder="_preflight",
            content_type="text/plain",
        )
        report["probe_path"] = upload_meta["path"]
        delete_from_supabase_storage(upload_meta["path"])
        report["ok"] = True
        report["details"] = "Storage write/delete probe succeeded"
    except Exception as exc:
        report["ok"] = False
        report["details"] = str(exc)

    return report
