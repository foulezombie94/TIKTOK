-- ===============================================
-- 👑 CRÉATION DU COMPTE SUPER-ADMIN (VERSION FIXÉE)
-- ===============================================

-- Utilisation d'un bloc DO pour plus de flexibilité avec les IDs
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000000';
  v_email text := 'admin@tiktok-cockpit.com';
  v_pass text := 'Admin2026!Global';
BEGIN
  -- 1. Ajout de l'utilisateur dans auth.users
  -- NOTE: On utilise une sous-requête pour vérifier l'existence car ON CONFLICT peut échouer 
  -- sans index unique EXPLICITE sur certains schémas personnalisés.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      '',
      '{"provider":"email","providers":["email"],"role":"admin"}',
      '{"username":"superadmin","role":"admin"}',
      false,
      now(),
      now()
    );
  END IF;

  -- 2. Liaison avec la table public.users
  INSERT INTO public.users (id, username, display_name, role, status)
  VALUES (
    v_user_id,
    'superadmin',
    'Digital Curator (Admin)',
    'admin',
    'active'
  ) ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

  -- 3. Ajout dans la table de sécurité admin_roles
  INSERT INTO public.admin_roles (user_id, level_access)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id) DO NOTHING;

END $$;
