-- Naily plain PostgreSQL schema (no Supabase, no RLS, no UUID extension)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  username      TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','inactive','cancelled')),
  subscription_plan   TEXT CHECK (subscription_plan IN ('monthly','yearly')),
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colors (
  id           SERIAL PRIMARY KEY,
  tech_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  number       TEXT NOT NULL,
  hex          TEXT NOT NULL DEFAULT '#ffffff',
  out_of_stock BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  tech_id       INT REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id        SERIAL PRIMARY KEY,
  tech_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  color_id  INT REFERENCES colors(id) ON DELETE SET NULL,
  date      DATE NOT NULL,
  time      TIME NOT NULL,
  status    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'done')),
  booked_by TEXT NOT NULL DEFAULT 'client' CHECK (booked_by IN ('client', 'tech')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id           SERIAL PRIMARY KEY,
  tech_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      BOOLEAN NOT NULL DEFAULT true,
  start_time   TIME NOT NULL DEFAULT '09:00',
  end_time     TIME NOT NULL DEFAULT '18:00',
  UNIQUE(tech_id, day_of_week)
);

-- Migration: add email/password_hash to clients if not present (for existing DBs)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- Migration: make tech_id nullable for self-registered clients
ALTER TABLE clients ALTER COLUMN tech_id DROP NOT NULL;

-- Migration: subscription and username fields for existing DBs
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
-- Migration: add cancelled status to appointments
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending','arrived','done','cancelled'));
-- Migration: availability table
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  tech_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  UNIQUE(tech_id, day_of_week)
);
