-- ===============================================
-- 🛡️ NOC HEAVY REPAIR : SCHÉMA & AUTHENTIFICATION (V2 - CASCADE)
-- ===============================================

-- 1. Nettoyage TOTAL des Triggers et fonctions dépendantes (Force)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS trg_log_user_moderation ON public.users CASCADE;
DROP FUNCTION IF EXISTS public.log_user_moderation_v2() CASCADE;

-- 2. Stabilisation de la table 'users' avec CASCADE
-- On force la suppression pour reconstruire proprement en TEXT
ALTER TABLE public.users 
DROP COLUMN IF EXISTS status CASCADE,
DROP COLUMN IF EXISTS role CASCADE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hardware_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_ip text DEFAULT NULL;

-- 3. Réindexation (V3 - Indexation propre)
CREATE INDEX IF NOT EXISTS idx_users_role_v3 ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_status_v3 ON public.users (status);

-- 4. Injection de l'Admin avec UUID et Metadonnées (Fix 500)
DO $$
DECLARE
  v_admin_email text := 'admin@tiktok-cockpit.com';
  v_admin_pass text := 'Admin2026!Global';
  v_new_id uuid := gen_random_uuid();
BEGIN
  -- Si l'admin existe déjà dans auth.users, on récupère son ID
  SELECT id INTO v_new_id FROM auth.users WHERE email = v_admin_email;
  
  IF v_new_id IS NULL THEN
    v_new_id := gen_random_uuid();
    -- On crée l'ID manuellement dans auth.users
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      v_new_id, '00000000-0000-0000-0000-000000000000', v_admin_email,
      crypt(v_admin_pass, gen_salt('bf')), now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"],"role":"admin"}',
      '{"username":"superadmin","role":"admin"}', now(), now()
    );
  END IF;

  -- Synchronisation forcée dans public.users (Sans trigger parasite)
  INSERT INTO public.users (id, username, display_name, role, status)
  VALUES (v_new_id, 'superadmin', 'Digital Curator (Admin)', 'admin', 'active')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

  -- Ajout dans admin_roles pour le middleware
  INSERT INTO public.admin_roles (user_id, level_access)
  VALUES (v_new_id, 'super_admin')
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- 5. Recréation du Audit Log (Propre)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ANALYZE public.users;
