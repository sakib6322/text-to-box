-- Granular page/action permissions for staff accounts
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check CHECK (role IN ('admin', 'staff', 'user'));

COMMENT ON COLUMN public.app_users.permissions IS 'Array of permission key strings; admin role ignores and has full access';
