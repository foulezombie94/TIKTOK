-- ===============================================
-- 💎 ULTIMATE HARMONY FIX : TIKTOK CLONE & ADMIN
-- ===============================================

-- 1. Nettoyage et Harmonisation de la table users (Standardisation TEXT)
-- (On s'assure que tout est en TEXT/BIGINT pour éviter les erreurs 500/406 d'ENUM)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
ADD COLUMN IF NOT EXISTS website text DEFAULT '',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hardware_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_ip text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS followers_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Suppression des contraintes "Not Null" bloquantes sans défaut
-- (Ceci règle l'erreur 422 lors du Signup)
ALTER TABLE public.users ALTER COLUMN username SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN display_name SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN avatar_url SET DEFAULT '';

-- 3. Fonction handle_new_user SUPER-DEFENSIVE (Signup 422 Fix)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, username, display_name, avatar_url, email, role, status
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id),
    new.email,
    'user',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Réactivation du Trigger (Sync Propre)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RELOAD SCHEMA CACHE (Fix 406 Not Acceptable)
-- C'est l'étape CRITIQUE qui force Supabase à voir le nouveau schéma
NOTIFY pgrst, 'reload schema';

-- 6. Forçage du RÔLE ADMIN pour le compte principal (bb748b0a-0af4-4e23-96aa-ccf977636158)
INSERT INTO public.admin_roles (user_id, level_access)
VALUES ('bb748b0a-0af4-4e23-96aa-ccf977636158', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.users SET role = 'admin' WHERE id = 'bb748b0a-0af4-4e23-96aa-ccf977636158';

-- Finalisation
ANALYZE public.users;
