from app.db import normalize_database_url


def test_render_postgres_url_gains_the_psycopg_driver() -> None:
    raw = "postgresql://classflow:secret@dpg-internal:5432/classflow"
    assert (
        normalize_database_url(raw)
        == "postgresql+psycopg://classflow:secret@dpg-internal:5432/classflow"
    )


def test_postgres_scheme_and_query_are_preserved() -> None:
    raw = "postgres://classflow:secret@example.internal:5432/classflow?sslmode=require"
    assert (
        normalize_database_url(raw)
        == "postgresql+psycopg://classflow:secret@example.internal:5432/classflow?sslmode=require"
    )


def test_existing_psycopg_url_is_unchanged() -> None:
    raw = "postgresql+psycopg://classflow:classflow@localhost:5432/classflow"
    assert normalize_database_url(raw) == raw
