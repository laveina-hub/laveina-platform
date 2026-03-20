export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string;
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          id?: string;
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          id?: string;
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      insurance_options: {
        Row: {
          coverage_amount_cents: number;
          created_at: string;
          display_order: number;
          id: string;
          is_active: boolean;
          surcharge_cents: number;
          updated_at: string;
        };
        Insert: {
          coverage_amount_cents: number;
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          surcharge_cents?: number;
          updated_at?: string;
        };
        Update: {
          coverage_amount_cents?: number;
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          surcharge_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications_log: {
        Row: {
          created_at: string;
          gallabox_message_id: string | null;
          id: string;
          recipient_phone: string;
          sent_at: string | null;
          shipment_id: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          gallabox_message_id?: string | null;
          id?: string;
          recipient_phone: string;
          sent_at?: string | null;
          shipment_id: string;
          status?: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          gallabox_message_id?: string | null;
          id?: string;
          recipient_phone?: string;
          sent_at?: string | null;
          shipment_id?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_log_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      otp_verifications: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          otp_hash: string;
          shipment_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          otp_hash: string;
          shipment_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          otp_hash?: string;
          shipment_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "otp_verifications_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      parcel_size_config: {
        Row: {
          height_cm: number;
          is_active: boolean;
          length_cm: number;
          max_weight_kg: number;
          size: Database["public"]["Enums"]["parcel_size"];
          updated_at: string;
          width_cm: number;
        };
        Insert: {
          height_cm: number;
          is_active?: boolean;
          length_cm: number;
          max_weight_kg: number;
          size: Database["public"]["Enums"]["parcel_size"];
          updated_at?: string;
          width_cm: number;
        };
        Update: {
          height_cm?: number;
          is_active?: boolean;
          length_cm?: number;
          max_weight_kg?: number;
          size?: Database["public"]["Enums"]["parcel_size"];
          updated_at?: string;
          width_cm?: number;
        };
        Relationships: [];
      };
      pending_bookings: {
        Row: {
          booking_data: Json;
          created_at: string;
          customer_id: string;
          id: string;
          processed: boolean;
        };
        Insert: {
          booking_data: Json;
          created_at?: string;
          customer_id: string;
          id?: string;
          processed?: boolean;
        };
        Update: {
          booking_data?: Json;
          created_at?: string;
          customer_id?: string;
          id?: string;
          processed?: boolean;
        };
        Relationships: [];
      };
      pickup_points: {
        Row: {
          address: string;
          city: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          is_open: boolean;
          latitude: number;
          longitude: number;
          name: string;
          owner_id: string | null;
          phone: string | null;
          postcode: string;
          updated_at: string;
          working_hours: Json | null;
        };
        Insert: {
          address: string;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          is_open?: boolean;
          latitude: number;
          longitude: number;
          name: string;
          owner_id?: string | null;
          phone?: string | null;
          postcode: string;
          updated_at?: string;
          working_hours?: Json | null;
        };
        Update: {
          address?: string;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          is_open?: boolean;
          latitude?: number;
          longitude?: number;
          name?: string;
          owner_id?: string | null;
          phone?: string | null;
          postcode?: string;
          updated_at?: string;
          working_hours?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "pickup_points_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_logs: {
        Row: {
          id: string;
          new_status: Database["public"]["Enums"]["shipment_status"];
          old_status: Database["public"]["Enums"]["shipment_status"];
          pickup_point_id: string | null;
          scanned_at: string;
          scanned_by: string | null;
          shipment_id: string;
        };
        Insert: {
          id?: string;
          new_status: Database["public"]["Enums"]["shipment_status"];
          old_status: Database["public"]["Enums"]["shipment_status"];
          pickup_point_id?: string | null;
          scanned_at?: string;
          scanned_by?: string | null;
          shipment_id: string;
        };
        Update: {
          id?: string;
          new_status?: Database["public"]["Enums"]["shipment_status"];
          old_status?: Database["public"]["Enums"]["shipment_status"];
          pickup_point_id?: string | null;
          scanned_at?: string;
          scanned_by?: string | null;
          shipment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_logs_pickup_point_id_fkey";
            columns: ["pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_logs_scanned_by_fkey";
            columns: ["scanned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_logs_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          billable_weight_kg: number;
          carrier_name: string | null;
          carrier_rate_cents: number | null;
          carrier_tracking_number: string | null;
          created_at: string;
          customer_id: string;
          delivery_mode: Database["public"]["Enums"]["delivery_mode"];
          delivery_speed: Database["public"]["Enums"]["delivery_speed"];
          destination_pickup_point_id: string;
          destination_postcode: string;
          id: string;
          insurance_amount_cents: number;
          insurance_option_id: string | null;
          insurance_surcharge_cents: number;
          label_url: string | null;
          margin_percent: number | null;
          origin_pickup_point_id: string;
          origin_postcode: string;
          parcel_height_cm: number;
          parcel_length_cm: number;
          parcel_size: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm: number;
          price_cents: number;
          qr_code_url: string | null;
          receiver_name: string;
          receiver_phone: string;
          sendcloud_parcel_id: number | null;
          sender_name: string;
          sender_phone: string;
          shipping_method_id: number | null;
          status: Database["public"]["Enums"]["shipment_status"];
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          tracking_id: string;
          updated_at: string;
          weight_kg: number;
        };
        Insert: {
          billable_weight_kg: number;
          carrier_name?: string | null;
          carrier_rate_cents?: number | null;
          carrier_tracking_number?: string | null;
          created_at?: string;
          customer_id: string;
          delivery_mode: Database["public"]["Enums"]["delivery_mode"];
          delivery_speed?: Database["public"]["Enums"]["delivery_speed"];
          destination_pickup_point_id: string;
          destination_postcode: string;
          id?: string;
          insurance_amount_cents?: number;
          insurance_option_id?: string | null;
          insurance_surcharge_cents?: number;
          label_url?: string | null;
          margin_percent?: number | null;
          origin_pickup_point_id: string;
          origin_postcode: string;
          parcel_height_cm: number;
          parcel_length_cm: number;
          parcel_size: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm: number;
          price_cents: number;
          qr_code_url?: string | null;
          receiver_name: string;
          receiver_phone: string;
          sendcloud_parcel_id?: number | null;
          sender_name: string;
          sender_phone: string;
          shipping_method_id?: number | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          tracking_id: string;
          updated_at?: string;
          weight_kg: number;
        };
        Update: {
          billable_weight_kg?: number;
          carrier_name?: string | null;
          carrier_rate_cents?: number | null;
          carrier_tracking_number?: string | null;
          created_at?: string;
          customer_id?: string;
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"];
          delivery_speed?: Database["public"]["Enums"]["delivery_speed"];
          destination_pickup_point_id?: string;
          destination_postcode?: string;
          id?: string;
          insurance_amount_cents?: number;
          insurance_option_id?: string | null;
          insurance_surcharge_cents?: number;
          label_url?: string | null;
          margin_percent?: number | null;
          origin_pickup_point_id?: string;
          origin_postcode?: string;
          parcel_height_cm?: number;
          parcel_length_cm?: number;
          parcel_size?: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm?: number;
          price_cents?: number;
          qr_code_url?: string | null;
          receiver_name?: string;
          receiver_phone?: string;
          sendcloud_parcel_id?: number | null;
          sender_name?: string;
          sender_phone?: string;
          shipping_method_id?: number | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          tracking_id?: string;
          updated_at?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_destination_pickup_point_id_fkey";
            columns: ["destination_pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_insurance_option_id_fkey";
            columns: ["insurance_option_id"];
            isOneToOne: false;
            referencedRelation: "insurance_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_origin_pickup_point_id_fkey";
            columns: ["origin_pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_tracking_id: { Args: never; Returns: string };
      get_admin_dashboard_stats: { Args: never; Returns: Json };
      get_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      delivery_mode: "internal" | "sendcloud";
      delivery_speed: "standard" | "express";
      parcel_size: "small" | "medium" | "large" | "extra_large" | "xxl";
      shipment_status:
        | "payment_confirmed"
        | "waiting_at_origin"
        | "received_at_origin"
        | "in_transit"
        | "arrived_at_destination"
        | "ready_for_pickup"
        | "delivered";
      user_role: "admin" | "pickup_point" | "customer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      delivery_mode: ["internal", "sendcloud"],
      delivery_speed: ["standard", "express"],
      parcel_size: ["small", "medium", "large", "extra_large", "xxl"],
      shipment_status: [
        "payment_confirmed",
        "waiting_at_origin",
        "received_at_origin",
        "in_transit",
        "arrived_at_destination",
        "ready_for_pickup",
        "delivered",
      ],
      user_role: ["admin", "pickup_point", "customer"],
    },
  },
} as const;
