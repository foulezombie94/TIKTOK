-- ========================================================
-- 🔄 SYNC AUTH -> PUBLIC : FIX DASHBOARD COCKPIT
-- Assure que les modifs dans Supabase Auth UI (ban_duration)
-- sont reflétées instantanément dans le Cockpit Admin.
-- ========================================================

-- 1. Fonction de synchronisation (SECURITY DEFINER pour toucher à public.users)
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si banned_until est mis à NULL -> Débannissement
  IF (NEW.banned_until IS NULL) THEN
    UPDATE public.users
    SET 
      status = 'active',
      banned_until = NULL,
      ban_reason = NULL
    WHERE id = NEW.id;
    
  -- Si banned_until est défini -> Bannissement sync date
  ELSE
    UPDATE public.users
    SET 
      status = 'banned',
      banned_until = NEW.banned_until
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Installation du Trigger sur la table d'authentification
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER UPDATE OF banned_until ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_update();

-- 3. Notification système
NOTIFY pgrst, 'reload schema';
