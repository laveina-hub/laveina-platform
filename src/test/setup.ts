import "@testing-library/jest-dom/vitest";

// Stub env vars required by src/env.ts so component tests that transitively
// import the molecules/atoms barrels (which pull Supabase client → env.ts)
// can boot under jsdom without a real .env file. Values are placeholders —
// nothing in a test should hit the network. Real validation still runs in
// dev/build; tests just need the @t3-oss/env-nextjs boot to succeed.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??= "test-gmaps-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
