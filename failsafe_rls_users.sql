-- ===============================================
-- 🛡️ FAILSAFE RLS FOR BAN ENFORCEMENT
-- ===============================================

-- S'assurer que la RLS est activée
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique : Permettre aux utilisateurs de lire leur propre statut
-- (Indispensable pour le contrôle côté client dans LoginScreen.tsx)
DROP POLICY IF EXISTS "Users can view own status" ON public.users;
CREATE POLICY "Users can view own status" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Politique : Permettre aux admins de tout voir (Cockpit)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users 
FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Re-charger le cache PostgREST
NOTIFY pgrst, 'reload schema';
