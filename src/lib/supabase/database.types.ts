export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      game_analyses: {
        Row: {
          cost_usd: number | null
          created_at: string
          game_id: string
          id: string
          language: string
          model: string
          payload: Json
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          game_id: string
          id?: string
          language: string
          model: string
          payload: Json
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          game_id?: string
          id?: string
          language?: string
          model?: string
          payload?: Json
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_analyses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          moves: Json
          opponent_level: string
          player_color: string
          result: string | null
          sharpness_breakdown: Json | null
          sharpness_score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          moves?: Json
          opponent_level: string
          player_color: string
          result?: string | null
          sharpness_breakdown?: Json | null
          sharpness_score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          moves?: Json
          opponent_level?: string
          player_color?: string
          result?: string | null
          sharpness_breakdown?: Json | null
          sharpness_score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      league_entries: {
        Row: {
          avg_sharpness: number | null
          created_at: string
          games_played: number
          id: string
          league_tier: string
          promotion_result: string | null
          season_id: string
          total_sharpness: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_sharpness?: never
          created_at?: string
          games_played?: number
          id?: string
          league_tier: string
          promotion_result?: string | null
          season_id: string
          total_sharpness?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_sharpness?: never
          created_at?: string
          games_played?: number
          id?: string
          league_tier?: string
          promotion_result?: string | null
          season_id?: string
          total_sharpness?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "league_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          season_number: number
          settled: boolean
          settled_at: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          season_number: number
          settled?: boolean
          settled_at?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          season_number?: number
          settled?: boolean
          settled_at?: string | null
          start_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility_mode: boolean
          board_theme: string
          capture_input_mode: string
          created_at: string
          current_sharpness: number
          display_name: string | null
          goal: string | null
          id: string
          language: string
          last_activity_date: string | null
          league_tier: string
          level: string
          show_legal_moves: boolean
          show_recommended_moves: boolean
          streak_days: number
          streak_freezes_remaining: number
          stripe_customer_id: string | null
          subscription_status: string | null
          subscription_tier: string
          theme: string
          updated_at: string
        }
        Insert: {
          accessibility_mode?: boolean
          board_theme?: string
          capture_input_mode?: string
          created_at?: string
          current_sharpness?: number
          display_name?: string | null
          goal?: string | null
          id: string
          language?: string
          last_activity_date?: string | null
          league_tier?: string
          level?: string
          show_legal_moves?: boolean
          show_recommended_moves?: boolean
          streak_days?: number
          streak_freezes_remaining?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          accessibility_mode?: boolean
          board_theme?: string
          capture_input_mode?: string
          created_at?: string
          current_sharpness?: number
          display_name?: string | null
          goal?: string | null
          id?: string
          language?: string
          last_activity_date?: string | null
          league_tier?: string
          level?: string
          show_legal_moves?: boolean
          show_recommended_moves?: boolean
          streak_days?: number
          streak_freezes_remaining?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      puzzle_attempts: {
        Row: {
          attempts_used: number
          created_at: string
          id: string
          puzzle_id: string
          solved: boolean
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          attempts_used?: number
          created_at?: string
          id?: string
          puzzle_id: string
          solved: boolean
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          attempts_used?: number
          created_at?: string
          id?: string
          puzzle_id?: string
          solved?: boolean
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      puzzles: {
        Row: {
          created_at: string
          difficulty: number
          explanation_en: string
          explanation_ru: string
          id: string
          position: Json
          side_to_move: string
          slug: string | null
          solution_moves: Json
          theme: string | null
        }
        Insert: {
          created_at?: string
          difficulty: number
          explanation_en: string
          explanation_ru: string
          id?: string
          position: Json
          side_to_move: string
          slug?: string | null
          solution_moves: Json
          theme?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: number
          explanation_en?: string
          explanation_ru?: string
          id?: string
          position?: Json
          side_to_move?: string
          slug?: string | null
          solution_moves?: Json
          theme?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          id: string
          price_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_current_season: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      record_league_game: {
        Args: {
          p_user_id: string
          p_sharpness_score: number
        }
        Returns: undefined
      }
      reserve_rate_limit_slot: {
        Args: {
          p_action: string
          p_limit: number
          p_user_id: string
          p_window_start: string
        }
        Returns: {
          allowed: boolean
          new_count: number
        }[]
      }
      settle_league_season: {
        Args: {
          p_season_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
