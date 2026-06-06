/**
 * Supabase database types.
 *
 * NOTE: hand-authored to match supabase/migrations/0001_init.sql. Once the
 * Tucan Supabase project exists, regenerate this file from the live schema:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 * (or via the Supabase MCP `generate_typescript_types`).
 */

type Timestamptz = string;
type DateString = string; // YYYY-MM-DD (local day)

export type ThemePref = 'light' | 'dark' | 'auto';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          theme_pref: ThemePref;
          reminder_enabled: boolean;
          reminder_time: string | null;
          is_premium: boolean;
          created_at: Timestamptz;
          updated_at: Timestamptz;
          deleted: boolean;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          theme_pref?: ThemePref;
          reminder_enabled?: boolean;
          reminder_time?: string | null;
          is_premium?: boolean;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
          deleted?: boolean;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          start_date: DateString;
          sort_order: number;
          archived_at: Timestamptz | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
          deleted: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          start_date: DateString;
          sort_order?: number;
          archived_at?: Timestamptz | null;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
          deleted?: boolean;
        };
        Update: Partial<Database['public']['Tables']['habits']['Insert']>;
        Relationships: [];
      };
      completions: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          date: DateString;
          created_at: Timestamptz;
          updated_at: Timestamptz;
          deleted: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          date: DateString;
          created_at?: Timestamptz;
          updated_at?: Timestamptz;
          deleted?: boolean;
        };
        Update: Partial<Database['public']['Tables']['completions']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
