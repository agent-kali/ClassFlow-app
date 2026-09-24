-- Runs once on first container start. pytest points TEST_DATABASE_URL here and
-- builds the schema itself with `alembic upgrade head`.
CREATE DATABASE classflow_test OWNER classflow;
