type ProductVisibility = { visible: boolean; categoryVisible: boolean | null };

export function getProductPublicationState(product: ProductVisibility) {
  if (!product.visible) return "hidden";
  return product.categoryVisible === false ? "hidden-by-category" : "published";
}

export function isProductPublished(product: ProductVisibility): boolean {
  return getProductPublicationState(product) === "published";
}
