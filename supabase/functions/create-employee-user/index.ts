import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing Authorization Bearer token" });
    }

    // ✅ Env robusto (por si tienes secrets duplicados con nombres diferentes)
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ||
      Deno.env.get("PROJECT_URL") ||
      "";
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("ANON_KEY") ||
      "";
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY") ||
      "";

    if (!supabaseUrl) return json(500, { error: "Missing SUPABASE_URL / PROJECT_URL" });
    if (!anonKey) return json(500, { error: "Missing SUPABASE_ANON_KEY / ANON_KEY" });
    if (!serviceRoleKey) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY" });

    // 1) Cliente para validar sesión del que llama (usa ANON + Bearer del usuario)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: caller, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller?.user) {
      return json(401, { error: "Invalid session", details: callerErr?.message || "" });
    }
    const callerId = caller.user.id;

    // 2) Cliente admin para acciones privilegiadas (Service Role, SIN override de Authorization)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 3) Ver rol / company_id desde public.users (con adminClient)
    const { data: callerUser, error: cuErr } = await adminClient
      .from("users")
      .select("role, company_id")
      .eq("auth_id", callerId)
      .single();

    if (cuErr || !callerUser) return json(403, { error: "Caller not found in users" });
    if (callerUser.role !== "COMPANY_ADMIN") return json(403, { error: "Only COMPANY_ADMIN can create employees" });
    if (!callerUser.company_id) return json(400, { error: "Caller has no company_id" });

    const companyId = callerUser.company_id as string;

    // 4) Payload
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const document_type = String(body?.document_type || "").trim();
    const document_number = String(body?.document_number || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();

    if (!name || !document_type || !document_number || !email || !password) {
      return json(400, { error: "Missing required fields" });
    }

    const position = body?.position ?? null;
    const department = body?.department ?? null;
    const credit_limit = Number(body?.credit_limit ?? 0);
    const max_installments = Number(body?.max_installments ?? 1);
    const active = body?.active ?? true;

    // 5) Evitar duplicado por documento en la empresa
    const { data: existingEmp } = await adminClient
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("document_type", document_type)
      .eq("document_number", document_number)
      .maybeSingle();

    if (existingEmp?.id) {
      return json(409, { error: "Employee already exists for this company (document duplicate)" });
    }

    // 6) Crear usuario en Auth (email confirmado)
    const { data: createdAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createAuthErr || !createdAuth?.user) {
      return json(400, { error: "Failed to create auth user", details: createAuthErr?.message || "" });
    }

    const employeeAuthId = createdAuth.user.id;

    // 7) Crear empleado
    const { data: newEmp, error: empErr } = await adminClient
      .from("employees")
      .insert({
        company_id: companyId,
        name,
        document_type,
        document_number,
        email,
        position,
        department,
        credit_limit,
        max_installments,
        active,
      })
      .select("id")
      .single();

    if (empErr || !newEmp) {
      await adminClient.auth.admin.deleteUser(employeeAuthId);
      return json(400, { error: "Failed to create employee row", details: empErr?.message || "" });
    }

    const employeeId = newEmp.id as string;

    // 8) Crear fila en public.users con role EMPLOYEE
    const { error: usersErr } = await adminClient.from("users").insert({
      auth_id: employeeAuthId,
      role: "EMPLOYEE",
      company_id: companyId,
      employee_id: employeeId,
      name,
    });

    if (usersErr) {
      await adminClient.from("employees").delete().eq("id", employeeId);
      await adminClient.auth.admin.deleteUser(employeeAuthId);
      return json(400, { error: "Failed to create internal user record", details: usersErr.message });
    }

    return json(200, {
      ok: true,
      company_id: companyId,
      employee_id: employeeId,
      employee_auth_id: employeeAuthId,
    });
  } catch (e: any) {
    return json(500, { error: String(e?.message || e) });
  }
});