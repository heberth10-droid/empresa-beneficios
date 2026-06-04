"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tag, X, Save } from "lucide-react";

export default function AdminBrandsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [adminMap, setAdminMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  async function load() {
    const { data: brands } = await supabase
      .from("brands")
      .select("id, name, nit, logo_url, active, admin_id, created_at")
      .order("created_at", { ascending: false });

    const adminIds = [...new Set((brands || []).map((b: any) => b.admin_id).filter(Boolean))];
    let map: Record<string, string> = {};
    if (adminIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("auth_id, name")
        .in("auth_id", adminIds);
      for (const u of users || []) map[u.auth_id] = u.name || u.auth_id;
    }

    setRows(brands || []);
    setAdminMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(b: any) {
    setEditing(b.id);
    setEditName(b.name || "");
    setEditLogo(b.logo_url || "");
    setMsg(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase
      .from("brands")
      .update({ name: editName.trim(), logo_url: editLogo.trim() || null })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setMsg({ id, ok: false, text: "Error: " + error.message });
    } else {
      setMsg({ id, ok: true, text: "Guardado correctamente" });
      setEditing(null);
      load();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Marcas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {rows.length} marca{rows.length !== 1 ? "s" : ""} registrada{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {msg && !editing && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={msg.ok
            ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
            : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-48 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--nomi-border)" }} />
          ))
        ) : rows.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <Tag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>
              No hay marcas registradas aun
            </p>
          </div>
        ) : rows.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl overflow-hidden"
            style={{ border: "1.5px solid var(--nomi-border)" }}>

            {/* LOGO */}
            <div className="h-20 flex items-center justify-center p-4"
              style={{ backgroundColor: "var(--nomi-gray)" }}>
              {(editing === b.id ? editLogo : b.logo_url) ? (
                <img
                  src={editing === b.id ? editLogo : b.logo_url}
                  className="h-14 object-contain"
                  alt={b.name}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
                  style={{ backgroundColor: "var(--nomi-navy)" }}>
                  {(b.name || "M").charAt(0)}
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {editing === b.id ? (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--nomi-navy)" }}>Nombre</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--nomi-navy)" }}>URL del logo</label>
                    <input value={editLogo} onChange={(e) => setEditLogo(e.target.value)}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                  {msg?.id === b.id && (
                    <p className="text-xs font-semibold"
                      style={{ color: msg?.ok ? "#16A34A" : "#DC2626" }}>{msg?.text}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(b.id)} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                      style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                      <Save className="w-3.5 h-3.5" />
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                      {b.name || "Sin nombre"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      NIT: {b.nit || "—"}
                    </div>
                    {adminMap[b.admin_id] && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                        Admin: {adminMap[b.admin_id]}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={b.active
                        ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                        : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                      {b.active ? "Activa" : "Inactiva"}
                    </span>
                    <button onClick={() => startEdit(b)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition"
                      style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1px solid rgba(245,166,35,0.3)" }}>
                      Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
