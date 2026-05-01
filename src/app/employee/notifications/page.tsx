"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function EmployeeNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    // identificar employee -> company_id
    const { data: userRow } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("auth_id", user.id)
      .single();

    if (!userRow || userRow.role !== "EMPLOYEE" || !userRow.company_id) {
      router.push("/login");
      return;
    }

    // encontrar employee.id por email + company_id (tu lógica actual)
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", userRow.company_id)
      .eq("email", user.email)
      .single();

    if (empErr || !emp) {
      setErr("No se encontró tu registro de empleado.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_role", "EMPLOYEE")
      .eq("user_id", emp.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErr("No se pudieron cargar notificaciones: " + error.message);
      setLoading(false);
      return;
    }

    setNotes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  }

  if (loading) return <div className="text-slate-300">Cargando notificaciones...</div>;

  if (err) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
        {err}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-slate-400 text-sm">
            Aquí verás eventos importantes de tus compras.
          </p>
        </div>

        <button
          onClick={load}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 transition text-sm"
        >
          Refrescar
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-6 text-slate-300">
          No tienes notificaciones aún.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className={[
                "border rounded-lg p-4 transition",
                n.read
                  ? "border-slate-800 bg-slate-900"
                  : "border-emerald-500/40 bg-emerald-500/10",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-sm text-slate-300 mt-1">{n.message}</div>
                  <div className="text-xs text-slate-500 mt-2">{fmt(n.created_at)}</div>

                  {n.link && (
                    <Link
                      href={n.link}
                      className="inline-block mt-2 text-sm text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Ver detalle →
                    </Link>
                  )}
                </div>

                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-xs px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}