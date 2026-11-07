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
      customer_carts: {
        Row: {
          items: Json
          reminded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          items?: Json
          reminded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          items?: Json
          reminded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          approved_at: string | null
          clinic_name: string
          created_at: string
          discount_percent: number
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          address?: string
          approved_at?: string | null
          clinic_name?: string
          created_at?: string
          discount_percent?: number
          phone?: string
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          clinic_name?: string
          created_at?: string
          discount_percent?: number
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notify_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          completed_at: string | null
          coupon: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          delivery_fee: number
          discount_total: number
          exchange_rate: number
          id: string
          items: Json
          paid: boolean
          phone: string
          status: string
          total: number
          total_syp: number
          zone: string | null
        }
        Insert: {
          address: string
          completed_at?: string | null
          coupon?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          delivery_fee?: number
          discount_total?: number
          exchange_rate?: number
          id?: string
          items?: Json
          paid?: boolean
          phone: string
          status?: string
          total?: number
          total_syp?: number
          zone?: string | null
        }
        Update: {
          address?: string
          completed_at?: string | null
          coupon?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          delivery_fee?: number
          discount_total?: number
          exchange_rate?: number
          id?: string
          items?: Json
          paid?: boolean
          phone?: string
          status?: string
          total?: number
          total_syp?: number
          zone?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          brand: string
          bulk_price: number
          category: string
          created_at: string
          description: string
          id: string
          image: string
          name: string
          price: number
          stock: number | null
        }
        Insert: {
          active?: boolean
          brand?: string
          bulk_price?: number
          category?: string
          created_at?: string
          description?: string
          id: string
          image?: string
          name: string
          price?: number
          stock?: number | null
        }
        Update: {
          active?: boolean
          brand?: string
          bulk_price?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          image?: string
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          name: string
          percent: number
          scope: string
          starts_at: string | null
          target: string | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          name: string
          percent: number
          scope?: string
          starts_at?: string | null
          target?: string | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          name?: string
          percent?: number
          scope?: string
          starts_at?: string | null
          target?: string | null
          used_count?: number
        }
        Relationships: []
      }
      shop_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_exists: { Args: never; Returns: boolean }
      check_coupon: {
        Args: { p_code: string }
        Returns: {
          min_order: number
          name: string
          percent: number
          scope: string
          target: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admin: {
        Args: { p_message: string; p_title: string }
        Returns: undefined
      }
      place_order: {
        Args: {
          p_address: string
          p_coupon?: string
          p_items: Json
          p_name: string
          p_phone: string
          p_zone?: string
        }
        Returns: string
      }
      track_order: {
        Args: { p_phone: string; p_ref: string }
        Returns: {
          created_at: string
          items: Json
          status: string
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
