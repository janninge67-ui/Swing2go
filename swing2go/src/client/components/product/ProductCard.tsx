import { Link } from "react-router-dom";
import type { Product } from "@shared/types";
import { sv } from "@/i18n/sv";
import { formatKr, perBollOre } from "@/lib/format";
import { Ball } from "@/components/ui/Ball";
import { GradeBadge } from "./GradeBadge";

function lagerStatus(product: Product) {
  const total = product.variants.reduce((s, v) => s + v.stock, 0);
  if (total <= 0) return { text: sv.produkt.slut, farg: "bg-linje text-skiffer" };
  if (total <= 6) return { text: sv.produkt.faKvar, farg: "bg-fairway/40 text-skog-djup" };
  return { text: sv.produkt.iLager, farg: "bg-skog/10 text-skog" };
}

export function ProductCard({ product }: { product: Product }) {
  const billigast = product.variants.length
    ? Math.min(...product.variants.map(perBollOre))
    : null;
  const status = lagerStatus(product);

  return (
    <Link
      to={`/produkt/${product.slug}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-linje bg-white transition-colors hover:border-skog"
    >
      <div className="dimples-ljus relative flex aspect-[4/3] items-center justify-center bg-krita">
        <GradeBadge grade={product.grade} className="absolute left-4 top-4" />
        {product.isDemo && (
          <span className="absolute right-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-skiffer">
            {sv.produkt.demo}
          </span>
        )}
        {product.images[0] ? (
          <img src={product.images[0]} alt={`${product.brand} ${product.model}`} className="h-full w-full object-cover" />
        ) : (
          <Ball className="h-24 w-24 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-12" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-sm font-semibold text-gras">{product.brand}</p>
          <h3 className="mt-1 text-3xl text-skog">{product.model}</h3>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            {billigast !== null && (
              <p className="leading-none">
                <span className="text-sm text-skiffer">{sv.produkt.fran} </span>
                <span className="font-display text-4xl font-extrabold italic text-skog">
                  {formatKr(billigast)}
                </span>
                <span className="text-sm text-skiffer"> / boll</span>
              </p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.farg}`}>{status.text}</span>
        </div>
      </div>
    </Link>
  );
}
