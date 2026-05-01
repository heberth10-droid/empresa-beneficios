import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000";

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // opcional: ?date=YYYY-MM-DD (para pruebas)
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date"); // "2025-12-16"
  const rpcArgs: Record<string, any> = { app_base_url: APP_BASE_URL };
  if (dateParam) rpcArgs.p_date = dateParam;

  const { error } = await sb.rpc("enqueue_brand_daily_digest", rpcArgs);

  if (error) return new Response("RPC error: " + error.message, { status: 500 });

  return new Response("OK enqueue brand digest", { status: 200 });
});