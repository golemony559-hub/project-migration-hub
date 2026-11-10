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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          buyer_id: string
          created_at: string
          entitlement_id: string
          id: string
          kind: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          entitlement_id: string
          id?: string
          kind: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          entitlement_id?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_events_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          risk_guidance: string
          risk_sensitive: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          risk_guidance?: string
          risk_sensitive?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          risk_guidance?: string
          risk_sensitive?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      commercial_settings: {
        Row: {
          earnings_hold_days: number
          id: number
          notes: string
          paid_checkout_enabled: boolean
          platform_fee_bps: number
          processing_fee_bps: number
          processing_fee_fixed_cents: number
          rates_approved: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          earnings_hold_days?: number
          id?: number
          notes?: string
          paid_checkout_enabled?: boolean
          platform_fee_bps?: number
          processing_fee_bps?: number
          processing_fee_fixed_cents?: number
          rates_approved?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          earnings_hold_days?: number
          id?: number
          notes?: string
          paid_checkout_enabled?: boolean
          platform_fee_bps?: number
          processing_fee_bps?: number
          processing_fee_fixed_cents?: number
          rates_approved?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          buyer_id: string
          created_at: string
          guide_id: string
          id: string
          license_type: string
          order_id: string
          revoked_at: string | null
          revoked_reason: string | null
          version_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          guide_id: string
          id?: string
          license_type?: string
          order_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          version_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          guide_id?: string
          id?: string
          license_type?: string
          order_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_reviews: {
        Row: {
          created_at: string
          decision: string
          escalation_required: boolean
          guide_id: string
          id: string
          reason: string
          reviewer_id: string
          rubric: Json
          specialist_reviewed: boolean
          version_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          escalation_required?: boolean
          guide_id: string
          id?: string
          reason: string
          reviewer_id: string
          rubric?: Json
          specialist_reviewed?: boolean
          version_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          escalation_required?: boolean
          guide_id?: string
          id?: string
          reason?: string
          reviewer_id?: string
          rubric?: Json
          specialist_reviewed?: boolean
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_reviews_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_versions: {
        Row: {
          access_format: string
          accuracy_confirmed_at: string | null
          ai_assistance: string
          ai_disclosure: string
          audience: string
          category: string
          contents: string
          created_at: string
          creator_id: string
          currency_code: string
          description: string
          file_mime: string | null
          file_name: string | null
          file_path: string | null
          file_size_bytes: number | null
          format: string
          guide_id: string
          how_to_use: string
          id: string
          limitations: string
          outcomes: string
          preview_text: string
          price_cents: number
          reading_time_minutes: number | null
          reference_content: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rights_confirmed_at: string | null
          risk_sensitive: boolean
          sources_note: string
          state: string
          submitted_at: string | null
          summary: string
          tags: string[]
          team_price_cents: number | null
          title: string
          updated_at: string
          version_number: number
        }
        Insert: {
          access_format?: string
          accuracy_confirmed_at?: string | null
          ai_assistance?: string
          ai_disclosure?: string
          audience?: string
          category?: string
          contents?: string
          created_at?: string
          creator_id: string
          currency_code?: string
          description?: string
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string
          guide_id: string
          how_to_use?: string
          id?: string
          limitations?: string
          outcomes?: string
          preview_text?: string
          price_cents?: number
          reading_time_minutes?: number | null
          reference_content?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_confirmed_at?: string | null
          risk_sensitive?: boolean
          sources_note?: string
          state?: string
          submitted_at?: string | null
          summary?: string
          tags?: string[]
          team_price_cents?: number | null
          title?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          access_format?: string
          accuracy_confirmed_at?: string | null
          ai_assistance?: string
          ai_disclosure?: string
          audience?: string
          category?: string
          contents?: string
          created_at?: string
          creator_id?: string
          currency_code?: string
          description?: string
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string
          guide_id?: string
          how_to_use?: string
          id?: string
          limitations?: string
          outcomes?: string
          preview_text?: string
          price_cents?: number
          reading_time_minutes?: number | null
          reference_content?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_confirmed_at?: string | null
          risk_sensitive?: boolean
          sources_note?: string
          state?: string
          submitted_at?: string | null
          summary?: string
          tags?: string[]
          team_price_cents?: number | null
          title?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_versions_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "guide_versions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          access_format: string
          ai_assistance: string
          ai_disclosure: string
          audience: string
          category: string
          contents: string
          created_at: string
          creator_id: string
          currency_code: string
          description: string
          file_path: string | null
          format: string
          how_to_use: string
          id: string
          limitations: string
          live_updated_at: string | null
          outcomes: string
          preview_text: string
          price_cents: number
          published_at: string | null
          published_version_id: string | null
          reading_time_minutes: number | null
          risk_sensitive: boolean
          slug: string
          sources_note: string
          status: string
          summary: string
          tags: string[]
          team_price_cents: number | null
          title: string
          updated_at: string
        }
        Insert: {
          access_format?: string
          ai_assistance?: string
          ai_disclosure?: string
          audience?: string
          category: string
          contents?: string
          created_at?: string
          creator_id: string
          currency_code?: string
          description?: string
          file_path?: string | null
          format?: string
          how_to_use?: string
          id?: string
          limitations?: string
          live_updated_at?: string | null
          outcomes?: string
          preview_text?: string
          price_cents?: number
          published_at?: string | null
          published_version_id?: string | null
          reading_time_minutes?: number | null
          risk_sensitive?: boolean
          slug: string
          sources_note?: string
          status?: string
          summary: string
          tags?: string[]
          team_price_cents?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          access_format?: string
          ai_assistance?: string
          ai_disclosure?: string
          audience?: string
          category?: string
          contents?: string
          created_at?: string
          creator_id?: string
          currency_code?: string
          description?: string
          file_path?: string | null
          format?: string
          how_to_use?: string
          id?: string
          limitations?: string
          live_updated_at?: string | null
          outcomes?: string
          preview_text?: string
          price_cents?: number
          published_at?: string | null
          published_version_id?: string | null
          reading_time_minutes?: number | null
          risk_sensitive?: boolean
          slug?: string
          sources_note?: string
          status?: string
          summary?: string
          tags?: string[]
          team_price_cents?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "guides_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_published_version_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          available_at: string
          created_at: string
          created_by: string | null
          creator_id: string
          currency_code: string
          entry_type: string
          id: string
          note: string
          order_id: string | null
          payout_id: string | null
          rate_bps: number | null
        }
        Insert: {
          amount_cents: number
          available_at?: string
          created_at?: string
          created_by?: string | null
          creator_id: string
          currency_code: string
          entry_type: string
          id?: string
          note?: string
          order_id?: string | null
          payout_id?: string | null
          rate_bps?: number | null
        }
        Update: {
          amount_cents?: number
          available_at?: string
          created_at?: string
          created_by?: string | null
          creator_id?: string
          currency_code?: string
          entry_type?: string
          id?: string
          note?: string
          order_id?: string | null
          payout_id?: string | null
          rate_bps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_payout_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          currency_code: string
          guide_id: string
          id: string
          license_type: string
          order_reference: string
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
          version_id: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          creator_id: string
          currency_code: string
          guide_id: string
          id?: string
          license_type?: string
          order_reference?: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          version_id: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          currency_code?: string
          guide_id?: string
          id?: string
          license_type?: string
          order_reference?: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency_code: string | null
          event_type: string
          id: string
          order_id: string | null
          outcome: string
          payload: Json
          provider: string
          provider_event_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency_code?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          outcome?: string
          payload?: Json
          provider: string
          provider_event_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency_code?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          outcome?: string
          payload?: Json
          provider?: string
          provider_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          creator_id: string
          currency_code: string
          id: string
          method_note: string
          paid_at: string | null
          reference: string
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          creator_id: string
          currency_code: string
          id?: string
          method_note?: string
          paid_at?: string | null
          reference?: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          creator_id?: string
          currency_code?: string
          id?: string
          method_note?: string
          paid_at?: string | null
          reference?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_feedback: {
        Row: {
          buyer_id: string
          clarity: number
          comment: string
          created_at: string
          entitlement_id: string
          guide_id: string
          id: string
          listing_accuracy: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          status: string
          updated_at: string
          usefulness: number
          version_id: string
        }
        Insert: {
          buyer_id: string
          clarity: number
          comment?: string
          created_at?: string
          entitlement_id: string
          guide_id: string
          id?: string
          listing_accuracy: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          status?: string
          updated_at?: string
          usefulness: number
          version_id: string
        }
        Update: {
          buyer_id?: string
          clarity?: number
          comment?: string
          created_at?: string
          entitlement_id?: string
          guide_id?: string
          id?: string
          listing_accuracy?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          status?: string
          updated_at?: string
          usefulness?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_feedback_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_feedback_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: true
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_feedback_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_feedback_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          case_type: string
          created_at: string
          details: string
          guide_id: string | null
          id: string
          order_id: string | null
          reporter_id: string
          resolution: string
          resolution_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          case_type: string
          created_at?: string
          details: string
          guide_id?: string | null
          id?: string
          order_id?: string | null
          reporter_id: string
          resolution?: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          case_type?: string
          created_at?: string
          details?: string
          guide_id?: string | null
          id?: string
          order_id?: string | null
          reporter_id?: string
          resolution?: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "guide_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_user: {
        Args: { _body: string; _link: string; _title: string; _user_id: string }
        Returns: undefined
      }
      write_audit: {
        Args: {
          _action: string
          _details: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
