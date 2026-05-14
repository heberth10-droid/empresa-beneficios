import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FilteredCatalogPage filterType="brand" filterValue={id} />;
}