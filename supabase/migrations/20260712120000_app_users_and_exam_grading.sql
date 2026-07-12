-- App users (separate from Supabase Auth — REST API ready for mobile clients)
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON public.app_sessions(expires_at);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open app_users for service role" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open app_sessions for service role" ON public.app_sessions FOR ALL USING (true) WITH CHECK (true);

-- Default admins (login via Admin tab only — no registration)
INSERT INTO public.app_users (email, password_hash, role)
VALUES
  ('abc@gmail.com', '$2b$10$Ex/8c.7AS0KNAmj9yEclaODL471cJNDE8vqC.0VJfHgJB2i6aPPuC', 'admin'),
  ('nahian@gmail.com', '$2b$10$jOV7KhZgToHzCX7zfdJHdugPhOH1KJFgXF2c4gfPz7o8PVLouWKRW', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Granular exam grading breakdown per answer
ALTER TABLE public.exam_answers
  ADD COLUMN IF NOT EXISTS grading_detail jsonb;
