-- ============================================================
--  RAID-SecOps  ·  Database Schema  ·  Stage 1: Users
-- ============================================================
--  Run this in psql or pgAdmin connected to your RAID-SecOps DB
-- ============================================================

-- Enable pgcrypto for password hashing (comes with PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('analyst', 'engineer', 'grc')),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(200),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- Seed the three prototype users
-- Passwords are hashed with bcrypt (cost factor 12) via pgcrypto
INSERT INTO users (username, password_hash, role, full_name, email)
VALUES
  (
    'j.chen',
    crypt('analyst123', gen_salt('bf', 12)),
    'analyst',
    'Jamie Chen',
    'j.chen@raid-secops.local'
  ),
  (
    'r.patel',
    crypt('engineer123', gen_salt('bf', 12)),
    'engineer',
    'Rohan Patel',
    'r.patel@raid-secops.local'
  ),
  (
    'm.okafor',
    crypt('grc123', gen_salt('bf', 12)),
    'grc',
    'Mia Okafor',
    'm.okafor@raid-secops.local'
  )
ON CONFLICT (username) DO NOTHING;

-- Verify
SELECT id, username, role, full_name, is_active, created_at FROM users;
