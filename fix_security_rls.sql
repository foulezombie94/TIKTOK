-- ===============================================
-- 🛡️ SECURITY FIX : HARDWARE & IP TRACKING
-- Permet aux utilisateurs de mettre à jour leurs propres identifiants.
-- ===============================================

-- 1. Autoriser l'utilisateur authentifié à mettre à jour son IP et HW ID
-- (Condition critique : seulement pour lui-même)
DROP POLICY IF EXISTS "Users can update own security info" ON public.users;
CREATE POLICY "Users can update own security info" ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Autoriser le service_role (Admin API) à tout faire (sécurité totale)
DROP POLICY IF EXISTS "Admin full access" ON public.users;
CREATE POLICY "Admin full access" ON public.users
  FOR ALL
  TO service_role
  USING (true);

-- 3. Autoriser les administrateurs (Dashboard) à voir les IDs matériels
DROP POLICY IF EXISTS "Admins can view security info" ON public.users;
CREATE POLICY "Admins can view security info" ON public.users 
  FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Re-charger le cache
NOTIFY pgrst, 'reload schema';
