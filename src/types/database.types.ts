export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          metadata: Json;
          priority: Database["public"]["Enums"]["notification_priority"];
          read_at: string | null;
          shipment_id: string | null;
          status: string;
          title: string;
          tracking_id: string | null;
          type: Database["public"]["Enums"]["notification_type"];
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          metadata?: Json;
          priority?: Database["public"]["Enums"]["notification_priority"];
          read_at?: string | null;
          shipment_id?: string | null;
          status?: string;
          title: string;
          tracking_id?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          metadata?: Json;
          priority?: Database["public"]["Enums"]["notification_priority"];
          read_at?: string | null;
          shipment_id?: string | null;
          status?: string;
          title?: string;
          tracking_id?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
        };
        Relationships: [
          {
            foreignKeyName: "admin_notifications_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
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
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          ip_address: string | null;
          metadata: Json | null;
          resource: string;
          resource_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          resource: string;
          resource_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          resource?: string;
          resource_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_confirmation_tokens: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          shipment_id: string;
          token_hash: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          shipment_id: string;
          token_hash: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          shipment_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_confirmation_tokens_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
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
      notification_preferences: {
        Row: {
          customer_id: string;
          prefs: Json;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          prefs?: Json;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          prefs?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      otp_receiver_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          last_accessed_at: string | null;
          shipment_id: string;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          last_accessed_at?: string | null;
          shipment_id: string;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          last_accessed_at?: string | null;
          shipment_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "otp_receiver_tokens_shipment_id_fkey";
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
          display_code: string | null;
          expires_at: string;
          id: string;
          otp_hash: string;
          shipment_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          display_code?: string | null;
          expires_at: string;
          id?: string;
          otp_hash: string;
          shipment_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          display_code?: string | null;
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
      parcel_presets: {
        Row: {
          created_at: string;
          display_order: number;
          example_key: string;
          height_cm: number;
          is_active: boolean;
          length_cm: number;
          max_weight_kg: number;
          min_weight_kg: number;
          name_key: string;
          slug: string;
          updated_at: string;
          width_cm: number;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          example_key: string;
          height_cm: number;
          is_active?: boolean;
          length_cm: number;
          max_weight_kg: number;
          min_weight_kg: number;
          name_key: string;
          slug: string;
          updated_at?: string;
          width_cm: number;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          example_key?: string;
          height_cm?: number;
          is_active?: boolean;
          length_cm?: number;
          max_weight_kg?: number;
          min_weight_kg?: number;
          name_key?: string;
          slug?: string;
          updated_at?: string;
          width_cm?: number;
        };
        Relationships: [];
      };
      parcel_size_config: {
        Row: {
          is_active: boolean;
          max_weight_kg: number;
          min_weight_kg: number;
          size: Database["public"]["Enums"]["parcel_size"];
          updated_at: string;
        };
        Insert: {
          is_active?: boolean;
          max_weight_kg: number;
          min_weight_kg: number;
          size: Database["public"]["Enums"]["parcel_size"];
          updated_at?: string;
        };
        Update: {
          is_active?: boolean;
          max_weight_kg?: number;
          min_weight_kg?: number;
          size?: Database["public"]["Enums"]["parcel_size"];
          updated_at?: string;
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
          stripe_event_id: string | null;
        };
        Insert: {
          booking_data: Json;
          created_at?: string;
          customer_id: string;
          id?: string;
          processed?: boolean;
          stripe_event_id?: string | null;
        };
        Update: {
          booking_data?: Json;
          created_at?: string;
          customer_id?: string;
          id?: string;
          processed?: boolean;
          stripe_event_id?: string | null;
        };
        Relationships: [];
      };
      pickup_point_overrides: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          id: string;
          pickup_point_id: string;
          reason: string | null;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          pickup_point_id: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          pickup_point_id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pickup_point_overrides_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pickup_point_overrides_pickup_point_id_fkey";
            columns: ["pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_points: {
        Row: {
          address: string;
          city: string | null;
          created_at: string;
          email: string | null;
          id: string;
          image_url: string | null;
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
          image_url?: string | null;
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
          image_url?: string | null;
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
          city: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          phone: string | null;
          preferred_locale: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          phone?: string | null;
          preferred_locale?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          preferred_locale?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          breakdown: Json | null;
          comment: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          pickup_point_id: string | null;
          shipment_id: string;
          stars: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          breakdown?: Json | null;
          comment?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          pickup_point_id?: string | null;
          shipment_id: string;
          stars: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          breakdown?: Json | null;
          comment?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          pickup_point_id?: string | null;
          shipment_id?: string;
          stars?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_pickup_point_id_fkey";
            columns: ["pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_addresses: {
        Row: {
          created_at: string;
          customer_id: string;
          id: string;
          is_default: boolean;
          label: string;
          pickup_point_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          id?: string;
          is_default?: boolean;
          label: string;
          pickup_point_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          pickup_point_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_addresses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_addresses_pickup_point_id_fkey";
            columns: ["pickup_point_id"];
            isOneToOne: false;
            referencedRelation: "pickup_points";
            referencedColumns: ["id"];
          },
        ];
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
          parcel_preset_slug: string | null;
          parcel_size: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm: number;
          preferred_locale: string;
          price_cents: number;
          qr_code_url: string | null;
          receiver_email: string;
          receiver_first_name: string;
          receiver_last_name: string;
          receiver_phone: string;
          receiver_whatsapp: string | null;
          sendcloud_parcel_id: number | null;
          sendcloud_shipment_id: string | null;
          sender_email: string;
          sender_first_name: string;
          sender_last_name: string;
          sender_phone: string;
          sender_whatsapp: string | null;
          shipping_method_id: number | null;
          shipping_option_code: string | null;
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
          parcel_preset_slug?: string | null;
          parcel_size: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm: number;
          preferred_locale?: string;
          price_cents: number;
          qr_code_url?: string | null;
          receiver_email: string;
          receiver_first_name: string;
          receiver_last_name: string;
          receiver_phone: string;
          receiver_whatsapp?: string | null;
          sendcloud_parcel_id?: number | null;
          sendcloud_shipment_id?: string | null;
          sender_email: string;
          sender_first_name: string;
          sender_last_name: string;
          sender_phone: string;
          sender_whatsapp?: string | null;
          shipping_method_id?: number | null;
          shipping_option_code?: string | null;
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
          parcel_preset_slug?: string | null;
          parcel_size?: Database["public"]["Enums"]["parcel_size"];
          parcel_width_cm?: number;
          preferred_locale?: string;
          price_cents?: number;
          qr_code_url?: string | null;
          receiver_email?: string;
          receiver_first_name?: string;
          receiver_last_name?: string;
          receiver_phone?: string;
          receiver_whatsapp?: string | null;
          sendcloud_parcel_id?: number | null;
          sendcloud_shipment_id?: string | null;
          sender_email?: string;
          sender_first_name?: string;
          sender_last_name?: string;
          sender_phone?: string;
          sender_whatsapp?: string | null;
          shipping_method_id?: number | null;
          shipping_option_code?: string | null;
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
          {
            foreignKeyName: "shipments_parcel_preset_slug_fkey";
            columns: ["parcel_preset_slug"];
            isOneToOne: false;
            referencedRelation: "parcel_presets";
            referencedColumns: ["slug"];
          },
        ];
      };
      support_tickets: {
        Row: {
          admin_response: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          message: string;
          shipment_id: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          admin_response?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          message: string;
          shipment_id?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          admin_response?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          message?: string;
          shipment_id?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
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
      get_total_revenue_cents: { Args: never; Returns: number };
      get_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      delivery_mode: "internal" | "sendcloud";
      delivery_speed: "standard" | "express" | "next_day";
      notification_priority: "low" | "normal" | "high" | "critical";
      notification_type:
        | "new_booking_paid"
        | "parcel_received_at_origin"
        | "dispatch_failed"
        | "delivery_problem"
        | "parcel_returned"
        | "parcel_delivered";
      parcel_size: "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5" | "tier_6";
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
      delivery_speed: ["standard", "express", "next_day"],
      notification_priority: ["low", "normal", "high", "critical"],
      notification_type: [
        "new_booking_paid",
        "parcel_received_at_origin",
        "dispatch_failed",
        "delivery_problem",
        "parcel_returned",
        "parcel_delivered",
      ],
      parcel_size: ["tier_1", "tier_2", "tier_3", "tier_4", "tier_5", "tier_6"],
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
