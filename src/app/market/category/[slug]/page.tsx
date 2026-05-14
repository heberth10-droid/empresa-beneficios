import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);

  return <FilteredCatalogPage filterType="category" filterValue={category} />;
}