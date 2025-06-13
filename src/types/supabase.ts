
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Employee: {
        Row: {
          empl_email: string | null
          empl_gender: string | null
          empl_name: string
          empl_nik: string
          empl_password: string
          empl_telpnum: string | null
        }
        Insert: {
          empl_email?: string | null
          empl_gender?: string | null
          empl_name: string
          empl_nik: string
          empl_password: string
          empl_telpnum?: string | null
        }
        Update: {
          empl_email?: string | null
          empl_gender?: string | null
          empl_name?: string
          empl_nik?: string
          empl_password?: string
          empl_telpnum?: string | null
        }
        Relationships: []
      }
      Instrument: {
        Row: {
          inst_id: string
          inst_name: string
          inst_rentalprice: number
          inst_status: string
          inst_type: string
        }
        Insert: {
          inst_id: string
          inst_name: string
          inst_rentalprice: number
          inst_status: string
          inst_type: string
        }
        Update: {
          inst_id?: string
          inst_name?: string
          inst_rentalprice?: number
          inst_status?: string
          inst_type?: string
        }
        Relationships: []
      }
      Membership: {
        Row: {
          mmbr_creationdate: string
          mmbr_expirydate: string
          mmbr_id: string
          mmbr_points: number
          Student_stdn_id: string
        }
        Insert: {
          mmbr_creationdate: string
          mmbr_expirydate: string
          mmbr_id?: string
          mmbr_points?: number
          Student_stdn_id: string
        }
        Update: {
          mmbr_creationdate?: string
          mmbr_expirydate?: string
          mmbr_id?: string
          mmbr_points?: number
          Student_stdn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Membership_Student"
            columns: ["Student_stdn_id"]
            isOneToOne: true
            referencedRelation: "Student"
            referencedColumns: ["stdn_id"]
          },
        ]
      }
      Rental_Transaction: {
        Row: {
          Employee_empl_nik: string
          Room_room_id: string | null
          Student_stdn_id: string
          trsc_id: string
          trsc_latefee: number | null
          trsc_paymentmethod: string
          trsc_rentend: string
          trsc_rentstart: string
          trsc_returndate: string | null
          trsc_totalprice: number | null
          trsc_transactiondate: string
        }
        Insert: {
          Employee_empl_nik: string
          Room_room_id?: string | null
          Student_stdn_id: string
          trsc_id?: string
          trsc_latefee?: number | null
          trsc_paymentmethod: string
          trsc_rentend: string
          trsc_rentstart: string
          trsc_returndate?: string | null
          trsc_totalprice?: number | null
          trsc_transactiondate?: string
        }
        Update: {
          Employee_empl_nik?: string
          Room_room_id?: string | null
          Student_stdn_id?: string
          trsc_id?: string
          trsc_latefee?: number | null
          trsc_paymentmethod?: string
          trsc_rentend?: string
          trsc_rentstart?: string
          trsc_returndate?: string | null
          trsc_totalprice?: number | null
          trsc_transactiondate?: string
        }
        Relationships: [
          {
            foreignKeyName: "Rental_Transaction_Employee_fk"
            columns: ["Employee_empl_nik"]
            isOneToOne: false
            referencedRelation: "Employee"
            referencedColumns: ["empl_nik"]
          },
          {
            foreignKeyName: "Rental_Transaction_Room_fk"
            columns: ["Room_room_id"]
            isOneToOne: false
            referencedRelation: "Room"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "Rental_Transaction_Student_fk"
            columns: ["Student_stdn_id"]
            isOneToOne: false
            referencedRelation: "Student"
            referencedColumns: ["stdn_id"]
          },
        ]
      }
      Room: {
        Row: {
          room_id: string
          room_name: string
          room_rentrate: number
          room_size: string
        }
        Insert: {
          room_id: string
          room_name: string
          room_rentrate: number
          room_size: string
        }
        Update: {
          room_id?: string
          room_name?: string
          room_rentrate?: number
          room_size?: string
        }
        Relationships: []
      }
      Student: {
        Row: {
          auth_user_id: string | null
          stdn_id: string
          stdn_name: string
          stdn_telpnum: string
        }
        Insert: {
          auth_user_id?: string | null
          stdn_id: string
          stdn_name: string
          stdn_telpnum: string
        }
        Update: {
          auth_user_id?: string | null
          stdn_id?: string
          stdn_name?: string
          stdn_telpnum?: string
        }
        Relationships: []
      }
      Transaction_Instrument: {
        Row: {
          Instrument_inst_id: string
          Transaction_trsc_id: string
        }
        Insert: {
          Instrument_inst_id: string
          Transaction_trsc_id: string
        }
        Update: {
          Instrument_inst_id?: string
          Transaction_trsc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Transaction_Instrument_Instrument_fk"
            columns: ["Instrument_inst_id"]
            isOneToOne: false
            referencedRelation: "Instrument"
            referencedColumns: ["inst_id"]
          },
          {
            foreignKeyName: "Transaction_Instrument_Transaction_fk"
            columns: ["Transaction_trsc_id"]
            isOneToOne: false
            referencedRelation: "Rental_Transaction"
            referencedColumns: ["trsc_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_late_fee_days: {
        Args:
          | { in_trx_id: string; in_rate_per_day: number }
          | { in_trx_id: string; in_rate_per_day: number }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
