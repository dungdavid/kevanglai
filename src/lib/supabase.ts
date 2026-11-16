import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

let readClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Read-only client (anon key, RLS enforced) for rendering pages. */
export function getReadClient() {
  if (!url || !anonKey) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY chưa được cấu hình");
  readClient ??= createClient(url, anonKey, { auth: { persistSession: false } });
  return readClient;
}

/** Service-role client for ingest routes. Never expose to the browser. */
export function getAdminClient() {
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình");
  adminClient ??= createClient(url, serviceKey, { auth: { persistSession: false } });
  return adminClient;
}
