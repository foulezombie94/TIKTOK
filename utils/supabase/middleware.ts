import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Client Auth (pour refresh session itératif)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rafraîchir la session via Auth
  const { data: { user } } = await supabase.auth.getUser()

  // 2. BAN ENFORCEMENT INVULNÉRABLE (Bypass RLS via Service Role)
  if (user) {
    const isBannedPage = request.nextUrl.pathname.startsWith('/banned')
    
    if (!isBannedPage) {
      // Client Admin (Privilégié) - Ne pas exposer au client, s'exécute côté Edge/Serveur uniquement
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )

      const { data: userData, error: userError } = await adminSupabase
        .from('users')
        .select('status, ban_reason')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error(`[BAN ERROR] Failed to fetch status for ${user.id}: ${userError.message}`);
      }

      const currentStatus = userData?.status?.toLowerCase();
      if (userData && currentStatus === 'banned') {
        console.warn(`[BAN ENFORCED] Blocking user ${user.id} (Status: ${userData.status})`);
        const url = request.nextUrl.clone()
        url.pathname = '/banned'
        if (userData.ban_reason) {
          url.searchParams.set('reason', userData.ban_reason)
        }
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
