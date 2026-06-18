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
      agencies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agency_column_schemas: {
        Row: {
          agency_id: string
          columns: Json
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          notes: string | null
          published_at: string | null
          published_by: string | null
          version: number
        }
        Insert: {
          agency_id: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          version: number
        }
        Update: {
          agency_id?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_column_schemas_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_invitations: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          role: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          activity: string | null
          ag_price: number | null
          agency_id: string | null
          brand: string
          brand_pos: string | null
          campaign_status: string
          complete: boolean | null
          completion_status: string | null
          created_at: string | null
          created_by: string | null
          creator_fee: number | null
          creator_id: string | null
          currency: string | null
          custom_fields: Json
          id: string
          includes_vat: string | null
          invoice_no: string | null
          invoice_status: string | null
          launch_date: string | null
          live_date: string | null
          notes: string | null
          paid_date: string | null
          payment_terms: string | null
          shot: string | null
          updated_at: string | null
          xero_invoice_id: string | null
          xero_synced_at: string | null
        }
        Insert: {
          activity?: string | null
          ag_price?: number | null
          agency_id?: string | null
          brand: string
          brand_pos?: string | null
          campaign_status?: string
          complete?: boolean | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_fee?: number | null
          creator_id?: string | null
          currency?: string | null
          custom_fields?: Json
          id?: string
          includes_vat?: string | null
          invoice_no?: string | null
          invoice_status?: string | null
          launch_date?: string | null
          live_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          shot?: string | null
          updated_at?: string | null
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
        }
        Update: {
          activity?: string | null
          ag_price?: number | null
          agency_id?: string | null
          brand?: string
          brand_pos?: string | null
          campaign_status?: string
          complete?: boolean | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_fee?: number | null
          creator_id?: string | null
          currency?: string | null
          custom_fields?: Json
          id?: string
          includes_vat?: string | null
          invoice_no?: string | null
          invoice_status?: string | null
          launch_date?: string | null
          live_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          shot?: string | null
          updated_at?: string | null
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          agency_id: string | null
          campaign_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          platform: string
          source: string | null
          status: string | null
          thumbnail: string | null
          title: string
          type: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          agency_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          platform: string
          source?: string | null
          status?: string | null
          thumbnail?: string | null
          title: string
          type: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          agency_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          platform?: string
          source?: string | null
          status?: string | null
          thumbnail?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_platforms: {
        Row: {
          created_at: string | null
          creator_id: string
          engagement_rate: number | null
          follower_count: number | null
          platform_handle: string | null
          platform_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          engagement_rate?: number | null
          follower_count?: number | null
          platform_handle?: string | null
          platform_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          engagement_rate?: number | null
          follower_count?: number | null
          platform_handle?: string | null
          platform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_platforms_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_platforms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          agency_id: string | null
          avatar: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          handle: string
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          handle: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          handle?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creators_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_events: {
        Row: {
          agency_id: string | null
          all_day: boolean | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agency_id: string
          created_at: string | null
          data: Json | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          data?: Json | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          data?: Json | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          avatar_url: string | null
          campaign_alerts: boolean | null
          created_at: string | null
          creator_updates: boolean | null
          email: string | null
          email_notifications: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
          weekly_reports: boolean | null
        }
        Insert: {
          agency_id?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          campaign_alerts?: boolean | null
          created_at?: string | null
          creator_updates?: boolean | null
          email?: string | null
          email_notifications?: boolean | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          weekly_reports?: boolean | null
        }
        Update: {
          agency_id?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          campaign_alerts?: boolean | null
          created_at?: string | null
          creator_updates?: boolean | null
          email?: string | null
          email_notifications?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          weekly_reports?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string | null
          assigned_to: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          related_campaign_id: string | null
          related_creator_id: string | null
          sort_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          related_campaign_id?: string | null
          related_creator_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          related_campaign_id?: string | null
          related_creator_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_creator_id_fkey"
            columns: ["related_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_connections: {
        Row: {
          agency_id: string
          connected_by: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          refresh_token: string
          status: string
          tenant_id: string
          tenant_name: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          connected_by?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token: string
          status?: string
          tenant_id: string
          tenant_name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          connected_by?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token?: string
          status?: string
          tenant_id?: string
          tenant_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_agency_id: { Args: never; Returns: string }
      current_user_agency_role: { Args: never; Returns: string }
      default_campaign_columns: { Args: never; Returns: Json }
      disconnect_xero: { Args: never; Returns: undefined }
      get_published_column_schema: {
        Args: { p_agency_id: string }
        Returns: Json
      }
      get_xero_connection_status: {
        Args: never
        Returns: {
          last_synced_at: string
          status: string
          tenant_name: string
        }[]
      }
      is_agency_admin: { Args: never; Returns: boolean }
      seed_default_column_schema: {
        Args: { p_agency_id: string }
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
A new version of Supabase CLI is available: v2.107.0 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
