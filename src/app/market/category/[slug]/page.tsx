import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = decodeURIComponent(params.slug);

  return <FilteredCatalogPage filterType="category" filterValue={category} />;
}