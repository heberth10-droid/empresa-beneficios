import { Suspense } from "react";
import { notFound } from "next/navigation";
import FilteredCatalogPage from "../(store)/components/FilteredCatalogPage";

export default function CatalogPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
      </div>
    }>
      <FilteredCatalogPage
        filterType="all"
        filterValue=""
        initialQ={searchParams?.q || ""}
      />
    </Suspense>
  );
}
