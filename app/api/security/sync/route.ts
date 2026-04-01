import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * 🛰️ SECURITY SYNC (NOC-V5)
 * Capture l'IP (Serveur) et l'Hardware ID (Client) pour le bannissement Hardcore.
 * Utilise la clé Service Role pour contourner tout blocage RLS.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, hardwareId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // 1. Extraction de l'IP réelle (Standard HTTP)
    // Fonctionne sur 100% des requêtes, impossible à bloquer par le client.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown_network'

    console.log(`🛡️ SYNC SÉCURITÉ [${userId}] : IP=${ip} | HW=${hardwareId}`);

    // 2. Mise à jour forcée du profil utilisateur
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        last_ip: ip,
        hardware_id: hardwareId || 'UNKNOWN_HW_ID'
      })
      .eq('id', userId)

    if (error) {
      console.error("Erreur Sync Sécurité (Supabase):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ip, hardwareId }, { status: 200 })
  } catch (err: any) {
    console.error("Crash Sync Sécurité API:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
