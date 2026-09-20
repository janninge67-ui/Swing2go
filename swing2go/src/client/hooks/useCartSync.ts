import { useEffect, useMemo } from "react";
import { useCart } from "./useCart";
import { useProducts } from "./useProducts";
import { korgStatus, type RadStatus } from "@/lib/cartStatus";

/**
 * Håller varukorgen i linje med databasen: priser uppdateras, och rader som
 * saknas eller är slut markeras. Servern kontrollerar allt igen när ordern läggs.
 */
export function useCartSync() {
  const cart = useCart();
  const { products, loading } = useProducts();

  useEffect(() => {
    if (loading) return;
    for (const l of cart.lines) {
      const v = products.flatMap((p) => p.variants).find((x) => x.id === l.variantId);
      if (v && v.priceOre !== l.priceOre) cart.updatePrice(l.variantId, v.priceOre);
    }
  }, [products, loading, cart]);

  const status = useMemo<Map<string, RadStatus>>(
    () => (loading ? new Map() : korgStatus(cart.lines, products)),
    [cart.lines, products, loading],
  );

  const kanGaVidare =
    !loading && cart.lines.length > 0 && cart.lines.every((l) => status.get(l.variantId)?.typ === "ok");

  return { status, kanGaVidare, loading };
}
