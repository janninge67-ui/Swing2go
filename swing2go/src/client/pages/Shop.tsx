import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { sv } from "@/i18n/sv";
import { useProducts } from "@/hooks/useProducts";
import { perBollOre } from "@/lib/format";
import {
  antalAktiva,
  filterFranParams,
  filterTillParams,
  tillampaFilter,
  tomtFilter,
  type ShopFilter,
  type Sortering,
} from "@/lib/shopFilter";
import { ProductCard } from "@/components/product/ProductCard";
import { ShopFilters } from "@/components/product/ShopFilters";
import { IkonSok, IkonStang } from "@/components/ui/Icons";

export default function Shop() {
  const { products, loading, error } = useProducts();
  const [params, setParams] = useSearchParams();
  const [filterOppet, setFilterOppet] = useState(false);

  const filter = useMemo(() => filterFranParams(params), [params]);
  const traffar = useMemo(() => tillampaFilter(products, filter), [products, filter]);
  const aktiva = antalAktiva(filter);

  function andra(nytt: Partial<ShopFilter>) {
    setParams(filterTillParams({ ...filter, ...nytt }), { replace: true });
  }

  const marken = useMemo(() => {
    const antal = new Map<string, number>();
    products.forEach((p) => antal.set(p.brand, (antal.get(p.brand) ?? 0) + 1));
    return [...antal].map(([namn, n]) => ({ namn, antal: n })).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  }, [products]);

  const prisSpann = useMemo(() => {
    const alla = products.flatMap((p) => p.variants.map(perBollOre));
    if (!alla.length) return { min: 0, max: 0 };
    return {
      min: Math.floor(Math.min(...alla) / 50) * 50,
      max: Math.ceil(Math.max(...alla) / 50) * 50,
    };
  }, [products]);

  // Filterpanelen på mobil: Escape stänger, och sidan bakom scrollar inte.
  useEffect(() => {
    if (!filterOppet) return;
    const foreg = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilterOppet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = foreg;
      window.removeEventListener("keydown", onKey);
    };
  }, [filterOppet]);

  return (
    <>
      <section className="dimples bg-skog text-white">
        <div className="wrap py-10 md:py-14">
          <h1 className="text-6xl md:text-8xl">{sv.shop.rubrik}</h1>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mt-6 max-w-xl">
            <IkonSok className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-skog" />
            <input
              type="search"
              value={filter.sok}
              onChange={(e) => andra({ sok: e.target.value })}
              placeholder={sv.shop.sokPlaceholder}
              aria-label={sv.shop.sokPlaceholder}
              className="h-14 w-full rounded-full bg-white pl-12 pr-5 text-lg text-kol placeholder:text-skiffer/60"
            />
          </form>
        </div>
      </section>

      <div className="wrap grid gap-10 py-8 lg:grid-cols-[17rem_1fr] lg:py-12">
        {/* Filter: sidopanel på dator, helskärmspanel på mobil */}
        <aside
          aria-label={sv.shop.filter}
          className={
            filterOppet
              ? "fixed inset-0 z-50 flex flex-col bg-white"
              : "hidden lg:block"
          }
        >
          <div className="flex items-center justify-between border-b border-linje p-5 lg:hidden">
            <h2 className="text-4xl text-skog">{sv.shop.filter}</h2>
            <button
              type="button"
              onClick={() => setFilterOppet(false)}
              aria-label={sv.shop.stangFilter}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-krita"
            >
              <IkonStang />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:p-0 lg:pr-2">
            <ShopFilters filter={filter} onChange={andra} marken={marken} prisSpann={prisSpann} />
            {aktiva > 0 && (
              <button
                type="button"
                onClick={() => setParams(filterTillParams({ ...tomtFilter, sortering: filter.sortering }), { replace: true })}
                className="font-semibold text-gras underline underline-offset-4 hover:text-skog"
              >
                {sv.shop.rensa}
              </button>
            )}
          </div>

          <div className="border-t border-linje p-4 lg:hidden">
            <button type="button" onClick={() => setFilterOppet(false)} className="knapp knapp-mork w-full">
              {sv.shop.visa(traffar.length)}
            </button>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-skog" aria-live="polite">{sv.shop.antal(traffar.length)}</p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilterOppet(true)}
                className="knapp knapp-mork min-h-11 lg:hidden"
              >
                {sv.shop.filter}
                {aktiva > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fairway px-1.5 text-sm text-skog-djup">
                    {aktiva}
                  </span>
                )}
              </button>

              <label className="flex items-center gap-2 text-sm font-semibold text-skiffer">
                <span className="hidden sm:inline">{sv.shop.sortera}</span>
                <select
                  value={filter.sortering}
                  onChange={(e) => andra({ sortering: e.target.value as Sortering })}
                  className="h-11 rounded-full border border-linje bg-white px-4 text-base font-semibold text-skog"
                >
                  {(Object.keys(sv.shop.sortering) as Sortering[]).map((k) => (
                    <option key={k} value={k}>{sv.shop.sortering[k]}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 p-5 text-red-800">{sv.shop.fel}</p>
          ) : loading ? (
            <p className="text-skiffer">{sv.vanlig.laddar}</p>
          ) : traffar.length === 0 ? (
            <div className="dimples-ljus rounded-3xl bg-krita p-10">
              <h2 className="text-5xl text-skog">{sv.shop.tomRubrik}</h2>
              <p className="mt-3 text-skiffer">{sv.shop.tomText}</p>
              <button
                type="button"
                onClick={() => setParams({}, { replace: true })}
                className="knapp knapp-mork mt-6"
              >
                {sv.shop.rensa}
              </button>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {traffar.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
