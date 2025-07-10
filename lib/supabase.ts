import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          team_id: string
          first_name: string
          last_name: string
          email?: string
          profile_image?: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          first_name: string
          last_name: string
          email?: string
          profile_image?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          first_name?: string
          last_name?: string
          email?: string
          profile_image?: string
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          member_id: string
          date: string
          status: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          date: string
          status: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          date?: string
          status?: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at?: string
        }
      }
    }
  }
}
