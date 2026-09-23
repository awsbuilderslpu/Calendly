import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/config/env";

export function createDatabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
