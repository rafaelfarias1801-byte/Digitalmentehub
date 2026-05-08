import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  "https://nznyzjvtmqfcjkogkfju.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bnl6anZ0bXFmY2prb2drZmp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM1MDMxMCwiZXhwIjoyMDg4OTI2MzEwfQ.jBrZRB2VtYDuZD9u5leNxXQ3mWgiDAl2a65mwnV1AbQ",
  { auth: { autoRefreshToken: false, persistSession: false } }
);
