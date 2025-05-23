import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseApiKey = process.env.SUPABASE_SERVICE_API_KEY;
if (!supabaseUrl || !supabaseApiKey) {
  throw new Error("Invalid supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseApiKey);

export default supabase;
