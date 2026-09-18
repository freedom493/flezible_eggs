// Shared Supabase client for Flezible Eggs
// Loaded after the Supabase CDN script on every auth page.

const SUPABASE_URL = "https://yxblqchtvdiqmeehcgej.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Y3dX6jI1_fUyo9a_802LLg_rewL6RyY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
