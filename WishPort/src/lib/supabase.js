import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function supabaseUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name:
      user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    email: user.email || "",
    picture:
      user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
  };
}
