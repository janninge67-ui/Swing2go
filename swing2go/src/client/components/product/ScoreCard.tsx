import { useState } from "react";
import type { PackSize, Product } from "@shared/types";
import { sv } from "@/i18n/sv";
import { formatKr, perBollOre } from "@/lib/format";
import { GradeBadge } from "./GradeBadge";

// Hero-elementet: en produkt som scorekort. Kunden ser direkt hur
// priset per boll ändras när förpackningen byts.
export function ScoreCard({ product }: { product: Product }) {
  const [pack, setPack] = useState<PackSize>(6);
  const variant = product.variants.find((v) => v.packSize === pack) ?? product.variants[0];
  if (!variant) return null;

  const rad = "flex items-center justify-between border-b border-linje px-5 py-3";
  const etikett = "text-sm font-semibold text-gras";

  return (
    <div className="animera-kort w-full max-w-md rotate-[-2deg] overflow-hidden rounded-3xl bg-krita text-skog shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between bg-skog-djup px-5 py-3 text-white">
        <span className="font-display text-xl font-extrabold italic">{sv.namn}</span>
        {product.isDemo && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{sv.produkt.demo}</span>}
      </div>

      <div className={rad}>
        <span className={etikett}>{sv.hem.kortMarke}</span>
        <span className="text-lg font-bold">{product.brand}</span>
      </div>
      <div className={rad}>
        <span className={etikett}>{sv.hem.kortModell}</span>
        <span className="text-lg font-bold">{product.model}</span>
      </div>
      <div className={rad}>
        <span className={etikett}>{sv.hem.kortGrade}</span>
        <GradeBadge grade={product.grade} />
      </div>
      <div className={rad}>
        <span className={etikett}>{sv.hem.kortPack}</span>
        <div role="group" aria-label={sv.hem.kortPack} className="flex gap-1.5">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.packSize === pack}
              onClick={() => setPack(v.packSize)}
              className={`min-h-10 rounded-full px-4 font-bold transition-colors ${
                v.packSize === pack ? "bg-skog text-white" : "bg-white text-skog hover:bg-fairway/40"
              }`}
            >
              {sv.produkt.pack(v.packSize)}
            </button>
          ))}
        </div>
      </div>
      <div className={rad}>
        <span className={etikett}>{sv.hem.kortPris}</span>
        <span className="text-lg font-bold" aria-live="polite">{formatKr(variant.priceOre)}</span>
      </div>

      <div className="flex items-end justify-between bg-fairway px-5 py-4 text-skog-djup">
        <span className="text-sm font-bold">{sv.hem.kortPerBoll}</span>
        <span className="font-display text-6xl font-extrabold italic leading-none" aria-live="polite">
          {formatKr(perBollOre(variant))}
        </span>
      </div>
    </div>
  );
}
