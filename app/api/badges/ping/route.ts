import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Simple ping endpoint to test if API routes work
 */
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "API routes are working!",
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing"
    }
  })
}
