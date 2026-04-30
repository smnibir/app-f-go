-- Supabase PostgREST exposes `public` tables to `anon` / `authenticated` unless RLS blocks access.
-- This app uses Prisma with the database connection string (table owner bypasses RLS), not the Supabase Data API for these tables.
-- Enable RLS with no policies => deny via API roles; revoke grants for defense in depth.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImpersonationLog" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "User" FROM anon;
    REVOKE ALL ON TABLE "TimelineEntry" FROM anon;
    REVOKE ALL ON TABLE "Asset" FROM anon;
    REVOKE ALL ON TABLE "AppSettings" FROM anon;
    REVOKE ALL ON TABLE "EmailTemplate" FROM anon;
    REVOKE ALL ON TABLE "ImpersonationLog" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "User" FROM authenticated;
    REVOKE ALL ON TABLE "TimelineEntry" FROM authenticated;
    REVOKE ALL ON TABLE "Asset" FROM authenticated;
    REVOKE ALL ON TABLE "AppSettings" FROM authenticated;
    REVOKE ALL ON TABLE "EmailTemplate" FROM authenticated;
    REVOKE ALL ON TABLE "ImpersonationLog" FROM authenticated;
  END IF;
END $$;
