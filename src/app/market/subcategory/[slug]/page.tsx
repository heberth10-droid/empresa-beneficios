import FilteredCatalogPage from "../../(store)/components/FilteredCatalogPage";

export default function SubcategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const subcategory = decodeURIComponent(params.slug);

  return (
    <FilteredCatalogPage filterType="subcategory" filterValue={subcategory} />
  );
}