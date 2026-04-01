-- ========================================================
-- 🛡️ HARDCORE SECURITY : IP & HARDWARE BLACKLIST
-- Stocke les identifiants bannis pour un blocage total.
-- ========================================================

-- 1. Table des identifiants bannis
CREATE TABLE IF NOT EXISTS public.banned_hardware (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text, -- Adresse IP bannie
  hardware_id text, -- Fingerprint unique de l'appareil
  original_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text DEFAULT 'Bannissement réseau/matériel',
  created_at timestamptz DEFAULT now(),
  
  -- Index pour la performance du Middleware
  CONSTRAINT unique_ip UNIQUE (ip),
  CONSTRAINT unique_hardware_id UNIQUE (hardware_id)
);

-- Indexation pour recherche ultra-rapide
CREATE INDEX IF NOT EXISTS idx_banned_ip ON public.banned_hardware(ip);
CREATE INDEX IF NOT EXISTS idx_banned_hw ON public.banned_hardware(hardware_id);

-- RLS Politique : LECTURE seule par le rôle 'service_role' (Middleware)
-- Le public ne doit pas voir la liste des bannis.
ALTER TABLE public.banned_hardware ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only" ON public.banned_hardware
  FOR ALL TO service_role USING (true);

-- 2. Fonction RPC pour vérifier si un visiteur est banni matériellement
-- (Utilisée par le middleware pour une réponse ultra-rapide)
CREATE OR REPLACE FUNCTION public.check_is_hardware_banned(p_ip text, p_hardware_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.banned_hardware
    WHERE ip = p_ip OR (hardware_id = p_hardware_id AND p_hardware_id IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Autoriser le rôle anonyme à appeler ce check (indispensable pour le middleware)
GRANT EXECUTE ON FUNCTION public.check_is_hardware_banned(text, text) TO anon, authenticated, service_role;

-- 3. Notification système
NOTIFY pgrst, 'reload schema';
