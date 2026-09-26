import { createClient } from "@supabase/supabase-js";

export function getResultadosClient() {
  const supabaseUrl = import.meta.env.VITE_RESULTADOS_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_RESULTADOS_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_RESULTADOS_SUPABASE_URL or VITE_RESULTADOS_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
