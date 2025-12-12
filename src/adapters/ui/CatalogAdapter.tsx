export function mapProductsToCatalogVM(products: any) {
  return (
    products?.map((p: any) => ({
      id: p.id,
      title: p.name,
      price: p.price,
      image: p.image
    })) ?? []
  );
}
