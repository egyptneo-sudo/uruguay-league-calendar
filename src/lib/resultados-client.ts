// Nota: anon key é pública por design (RLS protege os dados)
// Hardcoded porque o Lovable não expõe env vars no plano free
import { createClient } from "@supabase/supabase-js";

export function getResultadosClient() {
  const supabaseUrl = "https://jvfkojmutwjoilmmhlce.supabase.co";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Zmtvam11dHdqb2lsbW1obGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDA1NTksImV4cCI6MjEwNTk3NjU1OX0.EU3YBee3zvJX2TKbA3TngActYu3q3FTj3CwSMvqApEU";

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
