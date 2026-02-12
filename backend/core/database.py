"""
Database configuration and session management
"""
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

def _normalize_database_url(raw_url: str) -> str:
    """
    Normalize and validate DATABASE_URL so startup failures are explicit.
    """
    url = raw_url.strip().strip("'").strip('"')

    # Normalize legacy scheme often used in old docs/platforms.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    # Enforce TLS by default for non-SQLite PostgreSQL URLs.
    if url.startswith("postgresql"):
        parts = urlsplit(url)
        query_items = parse_qsl(parts.query, keep_blank_values=True)
        query_keys = {key.lower() for key, _ in query_items}
        if "sslmode" not in query_keys:
            query_items.append(("sslmode", "require"))
            query = urlencode(query_items, doseq=True)
            url = urlunsplit(
                (parts.scheme, parts.netloc, parts.path, query, parts.fragment)
            )

    _validate_database_url(url)
    return url


def _validate_database_url(url: str) -> None:
    if "sqlite" in url:
        return

    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    username = parts.username or ""
    password = parts.password

    # Supabase Session/Transaction pooler requires project-ref in username.
    if host.endswith("pooler.supabase.com") and username == "postgres":
        raise ValueError(
            "DATABASE_URL misconfigured: Supabase pooler host requires username "
            "'postgres.<project_ref>', not plain 'postgres'."
        )

    if host.endswith("pooler.supabase.com") and (password is None or password == ""):
        raise ValueError(
            "DATABASE_URL misconfigured: password is empty. Place the URL-encoded "
            "database password between ':' and '@'."
        )


# Database URL - defaults to SQLite for development
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./patient_dashboard.db")
DATABASE_URL = _normalize_database_url(RAW_DATABASE_URL)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
