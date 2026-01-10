export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          id: string
          group_id: string | null
          farmer_id: string | null
          user_id: string | null
          crop_type: string | null
          variety: string | null
          grading: string | null
          harvest_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          farmer_id?: string | null
          user_id?: string | null
          crop_type?: string | null
          variety?: string | null
          grading?: string | null
          harvest_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          farmer_id?: string | null
          user_id?: string | null
          crop_type?: string | null
          variety?: string | null
          grading?: string | null
          harvest_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_farmer_id_fkey"
            columns: ["farmer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      group_files: {
        Row: {
          id: string
          batch_id: string | null
          group_id: string | null
          transaction_type: string | null
          metadata: Json | string | null
          ipfs_hash: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          group_id?: string | null
          transaction_type?: string | null
          metadata?: Json | string | null
          ipfs_hash?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          group_id?: string | null
          transaction_type?: string | null
          metadata?: Json | string | null
          ipfs_hash?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string | null
          full_name: string | null
          email: string | null
          user_type: string | null
          farm_location: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          email?: string | null
          user_type?: string | null
          farm_location?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string | null
          email?: string | null
          user_type?: string | null
          farm_location?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          transaction_id: string
          batch_id: string | null
          type: string | null
          from_address: string | null
          to_address: string | null
          quantity: number | null
          price: number | null
          transaction_timestamp: string | null
          previous_transaction_hash: string | null
          ipfs_hash: string | null
          product_details: Json | null
          metadata: Json | null
          blockchain_hash: string | null
        }
        Insert: {
          transaction_id: string
          batch_id?: string | null
          type?: string | null
          from_address?: string | null
          to_address?: string | null
          quantity?: number | null
          price?: number | null
          transaction_timestamp?: string | null
          previous_transaction_hash?: string | null
          ipfs_hash?: string | null
          product_details?: Json | null
          metadata?: Json | null
          blockchain_hash?: string | null
        }
        Update: {
          transaction_id?: string
          batch_id?: string | null
          type?: string | null
          from_address?: string | null
          to_address?: string | null
          quantity?: number | null
          price?: number | null
          transaction_timestamp?: string | null
          previous_transaction_hash?: string | null
          ipfs_hash?: string | null
          product_details?: Json | null
          metadata?: Json | null
          blockchain_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_batch_id_fkey"
            columns: ["batch_id"]
            referencedRelation: "batches"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
