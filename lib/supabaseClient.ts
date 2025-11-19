import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ensureEnvVars = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase URL veya anon key tanımlı değil. Lütfen .env dosyanızı kontrol edin. Uygulama bu durumda sınırlı çalışacaktır."
    );
    return false;
  }

  return true;
};

let browserClient: SupabaseClient | null = null;

export const getBrowserSupabaseClient = (): SupabaseClient | null => {
  if (!ensureEnvVars()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
};

export const getServerSupabaseClient = (accessToken?: string): SupabaseClient | null => {
  if (!ensureEnvVars()) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });
};
