import type { Variant } from "@shared/types";

/** 24900 öre -> "249 kr", 750 öre -> "7,50 kr" */
export function formatKr(ore: number): string {
  const kronor = ore / 100;
  const harOren = ore % 100 !== 0;
  return (
    new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: harOren ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(kronor) + " kr"
  );
}

/** Pris per boll räknas ut, den lagras aldrig. */
export function perBollOre(variant: Pick<Variant, "priceOre" | "packSize">): number {
  return Math.round(variant.priceOre / variant.packSize);
}
