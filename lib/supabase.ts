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
          invite_code: string
          password_hash?: string
          is_password_protected: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string
          invite_code?: string
          password_hash?: string
          is_password_protected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          invite_code?: string
          password_hash?: string
          is_password_protected?: boolean
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
          country_code?: string
          status?: string
          role?: string
          is_hidden?: boolean
          order_index?: number
        }
        Insert: {
          id?: string
          team_id: string
          first_name: string
          last_name: string
          email?: string
          profile_image?: string
          created_at?: string
          country_code?: string
          status?: string
          role?: string
          is_hidden?: boolean
          order_index?: number
        }
        Update: {
          id?: string
          team_id?: string
          first_name?: string
          last_name?: string
          email?: string
          profile_image?: string
          created_at?: string
          country_code?: string
          status?: string
          role?: string
          is_hidden?: boolean
          order_index?: number
        }
      }
      availability: {
        Row: {
          id: string
          member_id: string
          date: string
          status: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at: string
          updated_at?: string
          changed_by_id?: string
          auto_holiday?: boolean
        }
        Insert: {
          id?: string
          member_id: string
          date: string
          status: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at?: string
          updated_at?: string
          changed_by_id?: string
          auto_holiday?: boolean
        }
        Update: {
          id?: string
          member_id?: string
          date?: string
          status?: "available" | "remote" | "unavailable" | "need_to_check" | "absent" | "holiday" | "maybe"
          created_at?: string
          updated_at?: string
          changed_by_id?: string
          auto_holiday?: boolean
        }
      }
      countries: {
        Row: {
          code: string
          name: string
          name_nl?: string
          name_fr?: string
          created_at: string
        }
        Insert: {
          code: string
          name: string
          name_nl?: string
          name_fr?: string
          created_at?: string
        }
        Update: {
          code?: string
          name?: string
          name_nl?: string
          name_fr?: string
          created_at?: string
        }
      }
      holidays: {
        Row: {
          id: string
          country_code: string
          date: string
          name: string
          name_nl?: string
          name_fr?: string
          is_official: boolean
          custom: boolean
          created_at: string
        }
        Insert: {
          id?: string
          country_code: string
          date: string
          name: string
          name_nl?: string
          name_fr?: string
          is_official?: boolean
          custom?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          country_code?: string
          date?: string
          name?: string
          name_nl?: string
          name_fr?: string
          is_official?: boolean
          custom?: boolean
          created_at?: string
        }
      }
    }
  }
}
