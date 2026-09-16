import os
from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


# One engine (and so one connection pool) per URL, created on first use.
# Building an engine per request would open a new pool on every call.
_engines: dict[str, Engine] = {}
_session_factories: dict[str, sessionmaker[Session]] = {}


def get_engine() -> Engine:
    url = get_database_url()
    if url not in _engines:
        _engines[url] = create_engine(url, pool_pre_ping=True)
    return _engines[url]


def get_session_factory() -> sessionmaker[Session]:
    url = get_database_url()
    if url not in _session_factories:
        _session_factories[url] = sessionmaker(
            bind=get_engine(), autocommit=False, autoflush=False
        )
    return _session_factories[url]


def dispose_engines() -> None:
    """Drop cached engines and pools. Used when a process changes DATABASE_URL."""
    for engine in _engines.values():
        engine.dispose()
    _engines.clear()
    _session_factories.clear()


def get_db() -> Iterator[Session]:
    """
    FastAPI dependency: one session per request, committed only if the handler
    returned without raising. Routes never commit; the boundary owns it.
    """
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
