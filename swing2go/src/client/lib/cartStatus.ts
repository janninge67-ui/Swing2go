import type { CartLine, Product } from "@shared/types";

export type RadStatus =
  | { typ: "ok" }
  | { typ: "saknas" }
  | { typ: "slut" }
  | { typ: "forFa"; kvar: number };

/** Jämför varukorgen med aktuell katalog. */
export function korgStatus(lines: CartLine[], products: Product[]): Map<string, RadStatus> {
  const status = new Map<string, RadStatus>();
  for (const l of lines) {
    const variant = products.flatMap((p) => p.variants).find((v) => v.id === l.variantId);
    if (!variant) status.set(l.variantId, { typ: "saknas" });
    else if (variant.stock <= 0) status.set(l.variantId, { typ: "slut" });
    else if (variant.stock < l.quantity) status.set(l.variantId, { typ: "forFa", kvar: variant.stock });
    else status.set(l.variantId, { typ: "ok" });
  }
  return status;
}
