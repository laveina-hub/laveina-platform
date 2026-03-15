/**
 * Auto-generated Supabase Database types.
 * Regenerate with: npm run db:gen-types
 *
 * Placeholder — will be overwritten when connected to Supabase.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: "admin" | "pickup_point" | "customer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: "admin" | "pickup_point" | "customer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: "admin" | "pickup_point" | "customer";
          updated_at?: string;
        };
        Relationships: [];
      };
      pickup_points: {
        Row: {
          id: string;
          name: string;
          address: string;
          postcode: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          is_open: boolean;
          working_hours: Json | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          address: string;
          postcode: string;
          latitude: number;
          longitude: number;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          working_hours?: Json | null;
          owner_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          postcode?: string;
          latitude?: number;
          longitude?: number;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          is_open?: boolean;
          working_hours?: Json | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      postcodes: {
        Row: {
          id: string;
          code: string;
          zone: "A" | "B" | "C" | "D";
          city: string | null;
          region: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          zone: "A" | "B" | "C" | "D";
          city?: string | null;
          region?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          zone?: "A" | "B" | "C" | "D";
          city?: string | null;
          region?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pricing_rules: {
        Row: {
          id: string;
          origin_zone: "A" | "B" | "C" | "D";
          destination_zone: "A" | "B" | "C" | "D";
          min_weight_kg: number;
          max_weight_kg: number;
          price_cents: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          origin_zone: "A" | "B" | "C" | "D";
          destination_zone: "A" | "B" | "C" | "D";
          min_weight_kg: number;
          max_weight_kg: number;
          price_cents: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          origin_zone?: "A" | "B" | "C" | "D";
          destination_zone?: "A" | "B" | "C" | "D";
          min_weight_kg?: number;
          max_weight_kg?: number;
          price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          id: string;
          tracking_id: string;
          customer_id: string;
          sender_name: string;
          sender_phone: string;
          receiver_name: string;
          receiver_phone: string;
          origin_pickup_point_id: string;
          destination_pickup_point_id: string;
          origin_postcode: string;
          destination_postcode: string;
          weight_kg: number;
          price_cents: number;
          status:
            | "payment_confirmed"
            | "waiting_at_origin"
            | "received_at_origin"
            | "in_transit"
            | "arrived_at_destination"
            | "ready_for_pickup"
            | "delivered";
          stripe_payment_intent_id: string | null;
          qr_code_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          sender_name: string;
          sender_phone: string;
          receiver_name: string;
          receiver_phone: string;
          origin_pickup_point_id: string;
          destination_pickup_point_id: string;
          origin_postcode: string;
          destination_postcode: string;
          weight_kg: number;
          price_cents: number;
          status?:
            | "payment_confirmed"
            | "waiting_at_origin"
            | "received_at_origin"
            | "in_transit"
            | "arrived_at_destination"
            | "ready_for_pickup"
            | "delivered";
          stripe_payment_intent_id?: string | null;
          qr_code_url?: string | null;
        };
        Update: {
          id?: string;
          tracking_id?: string;
          customer_id?: string;
          sender_name?: string;
          sender_phone?: string;
          receiver_name?: string;
          receiver_phone?: string;
          origin_pickup_point_id?: string;
          destination_pickup_point_id?: string;
          origin_postcode?: string;
          destination_postcode?: string;
          weight_kg?: number;
          price_cents?: number;
          status?:
            | "payment_confirmed"
            | "waiting_at_origin"
            | "received_at_origin"
            | "in_transit"
            | "arrived_at_destination"
            | "ready_for_pickup"
            | "delivered";
          stripe_payment_intent_id?: string | null;
          qr_code_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_logs: {
        Row: {
          id: string;
          shipment_id: string;
          scanned_by: string;
          pickup_point_id: string | null;
          old_status: string;
          new_status: string;
          scanned_at: string;
        };
        Insert: {
          shipment_id: string;
          scanned_by: string;
          pickup_point_id?: string | null;
          old_status: string;
          new_status: string;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          scanned_by?: string;
          pickup_point_id?: string | null;
          old_status?: string;
          new_status?: string;
          scanned_at?: string;
        };
        Relationships: [];
      };
      otp_verifications: {
        Row: {
          id: string;
          shipment_id: string;
          otp_hash: string;
          expires_at: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          shipment_id: string;
          otp_hash: string;
          expires_at: string;
          verified?: boolean;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          otp_hash?: string;
          expires_at?: string;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "pickup_point" | "customer";
      zone_type: "A" | "B" | "C" | "D";
      shipment_status:
        | "payment_confirmed"
        | "waiting_at_origin"
        | "received_at_origin"
        | "in_transit"
        | "arrived_at_destination"
        | "ready_for_pickup"
        | "delivered";
    };
  };
};
