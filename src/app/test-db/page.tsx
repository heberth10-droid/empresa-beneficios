"use client";
console.log("ENV URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function TestDBPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) setErrorMsg(error.message);
      else setCompanies(data || []);
    }

    loadData();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Prueba de conexión con Supabase</h1>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

      {companies.length === 0 && !errorMsg && <p>No hay empresas aún.</p>}

      {companies.length > 0 && (
        <ul>
          {companies.map((company) => (
            <li key={company.id}>
              {company.name} — {company.nit}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
