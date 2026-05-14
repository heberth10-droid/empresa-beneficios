import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default function BrandPage({
  params,
}: {
  params: { id: string };
}) {
  return <FilteredCatalogPage filterType="brand" filterValue={params.id} />;
}