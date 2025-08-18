// Centralized TTL values (in seconds)
export const TTL = {
  ORDER: 60, // 30–60s; choose 60s
  PRODUCT: 300, // 60–300s; choose 300s
  STOCK: 10, // 5–15s; choose 10s
  SEARCH: 180, // 120–300s; choose 180s
} as const;

export type TtlKeys = keyof typeof TTL;
