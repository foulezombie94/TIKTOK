-- ==========================================
-- CORRECTIF MODÉRATION AVANCÉE (SQL)
-- ==========================================

-- 1. Ajout du type enum pour les status (plus robuste que du texte brut)
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'banned', 'shadowbanned', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Mise à jour de la table public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS ban_reason text,
ADD COLUMN IF NOT EXISTS hardware_id text, -- Fingerprint matériel
ADD COLUMN IF NOT EXISTS last_ip text;     -- Dernière IP connue

-- 3. Index pour la modération rapide
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);
CREATE INDEX IF NOT EXISTS idx_users_hardware_id ON public.users (hardware_id);

-- 4. Déclencher un log d'audit automatique lors d'un ban
CREATE OR REPLACE FUNCTION log_user_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO public.audit_log (action, resource_type, resource_id, metadata)
    VALUES (
      'USER_STATUS_CHANGE', 
      'user', 
      NEW.id, 
      jsonb_build_object('old', OLD.status, 'new', NEW.status, 'reason', NEW.ban_reason)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_user_moderation ON public.users;
CREATE TRIGGER trg_log_user_moderation
  AFTER UPDATE OF status ON public.users
  FOR EACH ROW EXECUTE FUNCTION log_user_moderation();
