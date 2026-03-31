-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner can read" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner can update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles: service role full access" ON public.profiles
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- COLORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.colors (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  number       TEXT NOT NULL,
  hex          TEXT NOT NULL DEFAULT '#ffffff',
  out_of_stock BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colors: owner can read" ON public.colors
  FOR SELECT USING (auth.uid() = tech_id);

CREATE POLICY "colors: owner can insert" ON public.colors
  FOR INSERT WITH CHECK (auth.uid() = tech_id);

CREATE POLICY "colors: owner can update" ON public.colors
  FOR UPDATE USING (auth.uid() = tech_id);

CREATE POLICY "colors: owner can delete" ON public.colors
  FOR DELETE USING (auth.uid() = tech_id);

-- Public read for booking flow (only non-deleted colors by tech)
CREATE POLICY "colors: public can read" ON public.colors
  FOR SELECT USING (true);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: owner can read" ON public.clients
  FOR SELECT USING (auth.uid() = tech_id);

CREATE POLICY "clients: owner can insert" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = tech_id);

CREATE POLICY "clients: owner can update" ON public.clients
  FOR UPDATE USING (auth.uid() = tech_id);

CREATE POLICY "clients: owner can delete" ON public.clients
  FOR DELETE USING (auth.uid() = tech_id);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tech_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  color_id   UUID REFERENCES public.colors(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  time       TIME NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'done')),
  booked_by  TEXT NOT NULL DEFAULT 'client' CHECK (booked_by IN ('client', 'tech')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments: owner can read" ON public.appointments
  FOR SELECT USING (auth.uid() = tech_id);

CREATE POLICY "appointments: owner can insert" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = tech_id);

CREATE POLICY "appointments: owner can update" ON public.appointments
  FOR UPDATE USING (auth.uid() = tech_id);

CREATE POLICY "appointments: owner can delete" ON public.appointments
  FOR DELETE USING (auth.uid() = tech_id);

-- Public insert for client booking flow
CREATE POLICY "appointments: public can insert" ON public.appointments
  FOR INSERT WITH CHECK (true);

-- Public read for slot availability
CREATE POLICY "appointments: public can read slots" ON public.appointments
  FOR SELECT USING (true);

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
