export function mapProductToDetail(product: any) {
  if (!product) {
    return null;
  }
  return {
    id: product.id,
    title: product.name || product.title || 'Product',
    subtitle: product.subtitle || product.category || '',
    description: product.description || '',
    price: product.price ?? null,
    currency: product.currency || '₪',
    images: product.images || (product.image ? [product.image] : product.image_url ? [product.image_url] : [])
  };
}
