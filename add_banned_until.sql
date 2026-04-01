-- ===============================================
-- 🕒 BAN END TIME : STORAGE & RETRIEVAL (NOC v2)
-- ===============================================

-- 1. Ajout de la colonne de stockage
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_until timestamptz DEFAULT NULL;

-- 2. Fonction RPC sécurisée pour récupérer les infos de ban par email
-- (Permet à un utilisateur déconnecté de connaître sa raison et sa date de fin de ban)
CREATE OR REPLACE FUNCTION public.get_user_ban_info(p_email text)
RETURNS TABLE (
  status text,
  ban_reason text,
  banned_until timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.status,
    u.ban_reason,
    u.banned_until
  FROM public.users u
  WHERE u.email = p_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Accorder l'accès à la fonction pour le rôle anonyme (indispensable au login)
GRANT EXECUTE ON FUNCTION public.get_user_ban_info(text) TO anon, authenticated;

-- Re-charger le cache PostgREST
NOTIFY pgrst, 'reload schema';
