import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subcategory = decodeURIComponent(slug);

  return (
    <FilteredCatalogPage filterType="subcategory" filterValue={subcategory} />
  );
}