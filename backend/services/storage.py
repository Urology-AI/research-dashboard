"""
Supabase Storage helpers for file persistence.
"""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any, Dict, Optional
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import quote
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


def _storage_headers(config: Dict[str, Any], content_type: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": config["service_role_key"],
        "Authorization": f"Bearer {config['service_role_key']}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _storage_api_request(
    config: Dict[str, Any],
    path: str,
    *,
    method: str = "GET",
    body: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 20,
) -> tuple[int, bytes]:
    """Perform a Supabase Storage REST API request."""
    if not config["configured"]:
        raise RuntimeError("Supabase storage is not configured")

    try:
        url = f"{config['url'].rstrip('/')}/storage/v1/{path.lstrip('/')}"
        req = urlrequest.Request(url, data=body, method=method)
        for key, value in (headers or {}).items():
            req.add_header(key, value)
        with urlrequest.urlopen(req, timeout=timeout) as response:
            return response.status, response.read()
    except urlerror.HTTPError as exc:
        body_text = ""
        try:
            body_text = exc.read().decode("utf-8")
        except Exception:  # noqa: BLE001
            body_text = str(exc.reason)
        raise RuntimeError(f"Storage API HTTP {exc.code}: {body_text or exc.reason}") from exc


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

    safe_filename = _sanitize_filename(filename)
    date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
    object_path = f"{folder}/{date_prefix}/{uuid4().hex}_{safe_filename}"
    full_path = quote(f"{config['bucket']}/{object_path}", safe="/")
    status, _ = _storage_api_request(
        config,
        f"object/{full_path}",
        method="POST",
        body=bytes(content),
        headers={
            **_storage_headers(config, content_type or "application/octet-stream"),
            "x-upsert": "false",
        },
    )
    if status not in (200, 201):
        raise RuntimeError(f"Storage upload failed with status {status}")

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
    full_path = quote(f"{config['bucket']}/{path}", safe="/")
    status, _ = _storage_api_request(
        config,
        f"object/{full_path}",
        method="DELETE",
        headers=_storage_headers(config),
    )
    if status not in (200, 204):
        raise RuntimeError(f"Storage delete failed with status {status}")


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
        # Verify the configured bucket exists and is visible to the service role key.
        list_status, list_payload = _storage_api_request(
            config,
            "bucket",
            method="GET",
            headers=_storage_headers(config),
        )
        if list_status not in (200, 204):
            raise RuntimeError(f"Storage bucket list failed with status {list_status}")
        payload_text = (list_payload or b"").decode("utf-8")
        if config["bucket"] not in payload_text:
            raise RuntimeError(f"Storage bucket '{config['bucket']}' not found")

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
