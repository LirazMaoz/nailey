-- Naily plain PostgreSQL schema (no Supabase, no RLS, no UUID extension)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
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
  id         SERIAL PRIMARY KEY,
  tech_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
