import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
  const EMAIL_FROM = Deno.env.get("EMAIL_FROM")!;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: batch, error: pickErr } = await sb
    .from("email_outbox")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(20);

  if (pickErr) return new Response("Pick error: " + pickErr.message, { status: 500 });
  if (!batch || batch.length === 0) return new Response("OK: no pending", { status: 200 });

  for (const row of batch) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: row.to_email,
          subject: row.subject,
          html: row.html,
        }),
      });

      const body = await r.text();

      if (!r.ok) {
        await sb.from("email_outbox").update({ status: "FAILED", error: body }).eq("id", row.id);
        continue;
      }

      await sb
        .from("email_outbox")
        .update({ status: "SENT", sent_at: new Date().toISOString(), error: null })
        .eq("id", row.id);
    } catch (e) {
      await sb.from("email_outbox").update({ status: "FAILED", error: String(e) }).eq("id", row.id);
    }
  }

  return new Response(`OK: processed ${batch.length}`, { status: 200 });
});