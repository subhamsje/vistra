"""
Database connection and session management for PostgreSQL / PostGIS.
"""

import os
from typing import Dict, Any, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL from environment variable
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgrespassword@localhost:5432/sih26011"
)

# SQLAlchemy engine & session factory
_engine = None
_SessionLocal = None


def get_db_engine(url: str = DATABASE_URL):
    """Get or initialize SQLAlchemy Engine."""
    global _engine
    if _engine is None or str(_engine.url) != url:
        # Avoid pooling issues when connection is unreachable
        _engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3} if "postgresql" in url else {})
    return _engine


def get_db_session(url: str = DATABASE_URL):
    """Get new SQLAlchemy Session instance."""
    engine = get_db_engine(url)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_factory()


def check_db_connection(url: str = DATABASE_URL) -> Tuple[bool, str]:
    """
    Check PostGIS database connectivity.
    
    Returns:
        Tuple of (is_connected: bool, status_message: str)
    """
    try:
        engine = get_db_engine(url)
        with engine.connect() as conn:
            # Test simple query and check PostGIS extension
            result = conn.execute(text("SELECT 1;"))
            row = result.fetchone()
            if row and row[0] == 1:
                try:
                    postgis_ver = conn.execute(text("SELECT PostGIS_Version();")).fetchone()
                    ver_str = postgis_ver[0] if postgis_ver else "installed"
                    return True, f"Connected (PostGIS {ver_str})"
                except Exception:
                    return True, "Connected (PostgreSQL, PostGIS extension unverified)"
            return False, "Database test query failed"
    except Exception as e:
        return False, f"Database connection unavailable: {str(e)}"
