"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FilteredCatalogPage from "../(store)/components/FilteredCatalogPage";

function CatalogContent() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";

  return (
    <FilteredCatalogPage
      key={q}
      filterType="all"
      filterValue=""
      initialQ={q}
    />
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
