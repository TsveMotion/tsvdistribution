// Cache key helpers for TsvStock

// Simple stable djb2 hash for strings -> base36 for shorter keys
export function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit and base36
  return (h >>> 0).toString(36);
}

export function orderKey(id: string) {
  return `orders:${id}`;
}

export function productKey(sku: string) {
  return `products:${sku}`;
}

export function stockKey(sku: string) {
  return `stock:${sku}`;
}

export function searchKey(q: string, page: number) {
  return `search:${hash(q)}:${page}`;
}

// Versioned prefixes for list invalidation (increment the version key on mutations)
export const PRODUCTS_VERSION_KEY = "prefix:products:version";

export function versionedProductsKey(version: number, page: number, filterHash: string) {
  return `products:v${version}:${page}:${filterHash}`;
}
