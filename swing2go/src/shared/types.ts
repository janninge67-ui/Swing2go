import type { GRADES, ORDER_STATUSES, PACK_SIZES } from "./constants";

export type Grade = (typeof GRADES)[number];
export type PackSize = (typeof PACK_SIZES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Variant {
  id: string;
  packSize: PackSize;
  /** Pris i öre (heltal, för att slippa avrundningsfel). */
  priceOre: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  description: string;
  grade: Grade;
  images: string[];
  variants: Variant[];
  /** Demo-produkt som ska tas bort innan skarp lansering. */
  isDemo: boolean;
}

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  grade: Grade;
  packSize: PackSize;
  priceOre: number;
  quantity: number;
}
