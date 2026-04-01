-- ==========================================
-- PHASE 4.1: OPTIMISATIONS HARDCORE (VERSION FINALE CORRIGÉE)
-- Performance, Dénormalisation, Triggers, Index
-- ==========================================


-- ==============================================
-- 1. DÉNORMALISATION DES COMPTEURS DANS videos
-- Au lieu de COUNT(*) dans chaque requête du feed
-- ==============================================

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS likes_count bigint DEFAULT 0;

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS comments_count bigint DEFAULT 0;

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS bookmarks_count bigint DEFAULT 0;


-- ==============================================
-- 2. TRIGGERS POUR INCRÉMENTER/DÉCRÉMENTER
-- Remplace les COUNT(*) par des O(1) lookups
-- ==============================================

-- === LIKES COUNTER ===
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_likes_count_insert ON public.likes;
CREATE TRIGGER trg_update_likes_count_insert
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

DROP TRIGGER IF EXISTS trg_update_likes_count_delete ON public.likes;
CREATE TRIGGER trg_update_likes_count_delete
  AFTER DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

-- === COMMENTS COUNTER ===
CREATE OR REPLACE FUNCTION update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_comments_count_insert ON public.comments;
CREATE TRIGGER trg_update_comments_count_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comments_count();

DROP TRIGGER IF EXISTS trg_update_comments_count_delete ON public.comments;
CREATE TRIGGER trg_update_comments_count_delete
  AFTER DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comments_count();

-- === BOOKMARKS COUNTER ===
CREATE OR REPLACE FUNCTION update_video_bookmarks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET bookmarks_count = GREATEST(bookmarks_count - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_bookmarks_count_insert ON public.bookmarks;
CREATE TRIGGER trg_update_bookmarks_count_insert
  AFTER INSERT ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_video_bookmarks_count();

DROP TRIGGER IF EXISTS trg_update_bookmarks_count_delete ON public.bookmarks;
CREATE TRIGGER trg_update_bookmarks_count_delete
  AFTER DELETE ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_video_bookmarks_count();


-- ==============================================
-- 3. BACKFILL: Synchroniser les compteurs existants
-- À exécuter une seule fois après ajout des colonnes
-- ==============================================

UPDATE public.videos v SET 
  likes_count = (SELECT COUNT(*) FROM public.likes l WHERE l.video_id = v.id),
  comments_count = (SELECT COUNT(*) FROM public.comments c WHERE c.video_id = v.id),
  bookmarks_count = (SELECT COUNT(*) FROM public.bookmarks b WHERE b.video_id = v.id);


-- ==============================================
-- 4. FONCTION RPC OPTIMISÉE (utilise colonnes dénormalisées)
-- Plus de COUNT(*) = O(1) au lieu de O(n)
-- ==============================================

CREATE OR REPLACE FUNCTION get_fyp_videos_v2(
  p_user_id uuid,
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
    -- Dénormalisé: O(1) read directement depuis la ligne video
    v.likes_count,
    v.comments_count,
    v.bookmarks_count,
    -- EXISTS utilise les index = ultra-rapide
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = p_user_id) AS user_has_liked,
    EXISTS(SELECT 1 FROM bookmarks b WHERE b.video_id = v.id AND b.user_id = p_user_id) AS user_has_saved,
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = v.user_id AND f.follower_id = p_user_id) AS user_is_following
  FROM videos v
  JOIN users u ON u.id = v.user_id
  WHERE
    (p_cursor IS NULL OR (v.created_at, v.id) < (p_cursor, p_cursor_id))
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ==============================================
-- 4.5 CORRECTIONS DE STRUCTURE AVANT INDEXATION
-- ==============================================
-- Ajout des colonnes manquantes pour la table messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Ajout de la colonne de lecture pour la table notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;


-- ==============================================
-- 5. INDEX CRITIQUES
-- ==============================================

-- Cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_videos_cursor 
ON public.videos (created_at DESC, id DESC);

-- Vidéos par utilisateur
CREATE INDEX IF NOT EXISTS idx_videos_user_created 
ON public.videos (user_id, created_at DESC);

-- Lookups rapides pour les EXISTS
CREATE INDEX IF NOT EXISTS idx_likes_user_video ON public.likes (user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_video ON public.bookmarks (user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON public.follows (follower_id, following_id);

-- Index PARTIEL pour les notifications non-lues (ultra-performant)
CREATE INDEX IF NOT EXISTS idx_notifications_unread_fast 
ON public.notifications (user_id) 
WHERE (is_read = false);

-- Messages non-lus (inbox badge)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON public.messages (receiver_id) 
WHERE (is_read = false);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participants
ON public.conversations (participant_1, participant_2);

-- Video views
CREATE INDEX IF NOT EXISTS idx_video_views_user_video 
ON public.video_views (user_id, video_id);


-- ==============================================
-- 6. WALLET CREDIT FUNCTION (Stripe webhook)
-- ==============================================

CREATE OR REPLACE FUNCTION credit_wallet(p_user_id uuid, p_amount int)
RETURNS boolean AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Le montant doit être positif'; END IF;
  
  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + p_amount;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==============================================
-- 7. AUDIT LOG TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit log" ON public.audit_log;
CREATE POLICY "Admin read audit log" ON public.audit_log 
FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));


-- ==============================================
-- 8. REFRESH STATISTIQUES
-- ==============================================

ANALYZE public.videos;
ANALYZE public.users;
ANALYZE public.likes;
ANALYZE public.comments;
ANALYZE public.bookmarks;
ANALYZE public.follows;
ANALYZE public.notifications;