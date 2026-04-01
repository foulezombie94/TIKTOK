-- ===============================================
-- 🛠️ RESTAURATION TIKTOK CLONE : SYNC & FEED
-- ===============================================

-- 1. Récupération des colonnes indispensables
-- (On s'assure qu'elles existent avant de recréer le trigger)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS email text;

-- 2. Recréation de la fonction de synchronisation Auth -> Public
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, avatar_url, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id),
    new.email,
    'user', -- Rôle par défaut (sécurisé)
    'active' -- Statut par défaut
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Réactivation du Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Correction de la vue/fonction du Feed Vidéo (get_fyp_videos)
-- On s'assure que p_user_id est géré même si NULL
CREATE OR REPLACE FUNCTION get_fyp_videos_v2(
  p_user_id uuid DEFAULT NULL,
  p_cursor timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid, user_id uuid, video_url text, thumbnail_url text,
  caption text, music_name text, views_count bigint,
  created_at timestamptz,
  username text, display_name text, avatar_url text,
  likes_count bigint, comments_count bigint, bookmarks_count bigint,
  user_has_liked boolean, user_has_saved boolean, user_is_following boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.video_url, v.thumbnail_url,
    v.caption, v.music_name, v.views_count, v.created_at,
    u.username, u.display_name, u.avatar_url,
    v.likes_count,
    v.comments_count,
    v.bookmarks_count,
    CASE WHEN p_user_id IS NOT NULL THEN EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = p_user_id) ELSE false END,
    CASE WHEN p_user_id IS NOT NULL THEN EXISTS(SELECT 1 FROM bookmarks b WHERE b.video_id = v.id AND b.user_id = p_user_id) ELSE false END,
    CASE WHEN p_user_id IS NOT NULL THEN EXISTS(SELECT 1 FROM follows f WHERE f.following_id = v.user_id AND f.follower_id = p_user_id) ELSE false END
  FROM videos v
  JOIN users u ON u.id = v.user_id
  WHERE
    (p_cursor IS NULL OR (v.created_at, v.id) < (p_cursor, p_cursor_id))
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. ANALYZE pour rafraîchir le planificateur PostgREST (Fix 406/400)
ANALYZE public.users;
ANALYZE public.videos;
