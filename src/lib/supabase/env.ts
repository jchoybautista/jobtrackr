/**
 * The two public Supabase identifiers. Both ship to the browser by design —
 * they identify the project, they don't authorize anything. Access control is
 * RLS's job, never these keys'.
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is not set. JobTrackr needs a Supabase project to run: copy ` +
      `.env.example to .env.local and fill in the values from your project's ` +
      `API settings.`,
    );
  }
  return value;
}

export function supabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
