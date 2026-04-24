import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_PROJECT_ID: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
    GALLABOX_API_KEY: z.string().min(1).optional(),
    GALLABOX_API_SECRET: z.string().min(1).optional(),
    GALLABOX_API_URL: z.string().url().optional(),
    GALLABOX_CHANNEL_ID: z.string().min(1).optional(),
    GALLABOX_PHONE: z.string().min(1).optional(),
    SENDCLOUD_PUBLIC_KEY: z.string().min(1).optional(),
    SENDCLOUD_SECRET_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    ADMIN_WHATSAPP_PHONE: z.string().min(1).optional(),
    SEND_OWNER_INVITES: z.enum(["true", "false"]).optional(),
    // DEV/TESTING FLAG — when "true", the Gallabox client short-circuits:
    // it logs the outbound WhatsApp payload and returns a fake success
    // response instead of hitting the real API. Purpose:
    //   1. Iterate on the booking/notification flow without a Gallabox
    //      account or while templates are still pending Meta approval.
    //   2. Avoid burning message credits during development.
    //   3. Keep the `notifications_log` table populated with realistic
    //      rows so dashboard + preferences UIs can be tested.
    // Leave unset (or "false") to hit the real Gallabox API. Recommended
    // lifecycle: stub ON for local dev → flip OFF on a preview deploy
    // with your own WhatsApp number → keep OFF in staging/prod.
    GALLABOX_STUB: z.enum(["true", "false"]).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
    // Map ID for Google Maps Advanced Markers. Create one in Google Cloud
    // Console → Google Maps Platform → Map Management. Optional in dev —
    // the code falls back to Google's DEMO_MAP_ID which shows a watermark
    // but works fine for local testing.
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    GALLABOX_API_KEY: process.env.GALLABOX_API_KEY,
    GALLABOX_API_SECRET: process.env.GALLABOX_API_SECRET,
    GALLABOX_API_URL: process.env.GALLABOX_API_URL,
    GALLABOX_CHANNEL_ID: process.env.GALLABOX_CHANNEL_ID,
    GALLABOX_PHONE: process.env.GALLABOX_PHONE,
    SENDCLOUD_PUBLIC_KEY: process.env.SENDCLOUD_PUBLIC_KEY,
    SENDCLOUD_SECRET_KEY: process.env.SENDCLOUD_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    ADMIN_WHATSAPP_PHONE: process.env.ADMIN_WHATSAPP_PHONE,
    SEND_OWNER_INVITES: process.env.SEND_OWNER_INVITES as "true" | "false" | undefined,
    GALLABOX_STUB: process.env.GALLABOX_STUB as "true" | "false" | undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
