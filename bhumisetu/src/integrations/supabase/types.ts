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
      audit_logs: {
        Row: {
          action: string
          details: string | null
          document_id: string | null
          id: string
          record_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          details?: string | null
          document_id?: string | null
          id?: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: string | null
          document_id?: string | null
          id?: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          record_id: string
          requested_by: string | null
          requested_changes: Json
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          record_id: string
          requested_by?: string | null
          requested_changes?: Json
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          record_id?: string
          requested_by?: string | null
          requested_changes?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "land_records"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          file_name: string
          file_path: string
          file_type: string
          id: string
          processed_at: string | null
          status: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_type: string
          id?: string
          processed_at?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      land_records: {
        Row: {
          created_at: string
          district: string | null
          document_id: string | null
          document_number: string | null
          father_or_guardian_name: string | null
          id: string
          land_area: string | null
          land_type: string | null
          owner_name: string
          pincode: string | null
          registration_date: string | null
          status: string
          survey_number: string
          taluka: string | null
          updated_at: string
          verified_at: string | null
          village: string | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          document_id?: string | null
          document_number?: string | null
          father_or_guardian_name?: string | null
          id?: string
          land_area?: string | null
          land_type?: string | null
          owner_name: string
          pincode?: string | null
          registration_date?: string | null
          status?: string
          survey_number: string
          taluka?: string | null
          updated_at?: string
          verified_at?: string | null
          village?: string | null
        }
        Update: {
          created_at?: string
          district?: string | null
          document_id?: string | null
          document_number?: string | null
          father_or_guardian_name?: string | null
          id?: string
          land_area?: string | null
          land_type?: string | null
          owner_name?: string
          pincode?: string | null
          registration_date?: string | null
          status?: string
          survey_number?: string
          taluka?: string | null
          updated_at?: string
          verified_at?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "land_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_results: {
        Row: {
          created_at: string
          detected_languages: string[]
          document_id: string
          document_type: string | null
          fields: Json
          id: string
          overall_confidence: number
        }
        Insert: {
          created_at?: string
          detected_languages?: string[]
          document_id: string
          document_type?: string | null
          fields?: Json
          id?: string
          overall_confidence?: number
        }
        Update: {
          created_at?: string
          detected_languages?: string[]
          document_id?: string
          document_type?: string | null
          fields?: Json
          id?: string
          overall_confidence?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocr_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
        }
        Relationships: []
      }
      verification_queue: {
        Row: {
          assigned_to: string | null
          created_at: string
          document_id: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          document_id: string
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          document_id?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
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
    Enums: {},
  },
} as const
