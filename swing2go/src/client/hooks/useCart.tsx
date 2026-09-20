import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine } from "@shared/types";
import { SHIPPING_ORE } from "@shared/constants";

const NYCKEL = "swing2go-varukorg";

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotalOre: number;
  shippingOre: number;
  totalOre: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  /** Håller priset i korgen i linje med databasen. */
  updatePrice: (variantId: string, priceOre: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

function laddaFranLagring(): CartLine[] {
  try {
    const rå = localStorage.getItem(NYCKEL);
    return rå ? (JSON.parse(rå) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(laddaFranLagring);

  useEffect(() => {
    try {
      localStorage.setItem(NYCKEL, JSON.stringify(lines));
    } catch {
      /* Lagring kan vara blockerad. Varukorgen fungerar ändå under sessionen. */
    }
  }, [lines]);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotalOre = lines.reduce((s, l) => s + l.priceOre * l.quantity, 0);
    const shippingOre = lines.length > 0 ? SHIPPING_ORE : 0;
    return {
      lines,
      count,
      subtotalOre,
      shippingOre,
      totalOre: subtotalOre + shippingOre,
      add: (line, quantity = 1) =>
        setLines((prev) => {
          const finns = prev.find((l) => l.variantId === line.variantId);
          if (finns) {
            return prev.map((l) =>
              l.variantId === line.variantId ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l,
            );
          }
          return [...prev, { ...line, quantity }];
        }),
      setQuantity: (variantId, quantity) =>
        setLines((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.variantId !== variantId)
            : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(20, quantity) } : l)),
        ),
      remove: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
      updatePrice: (variantId, priceOre) =>
        setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, priceOre } : l))),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart måste användas inom CartProvider.");
  return ctx;
}
