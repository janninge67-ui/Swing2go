import { Link } from "react-router-dom";
import { sv } from "@/i18n/sv";
import { useProducts } from "@/hooks/useProducts";
import { ScoreCard } from "@/components/product/ScoreCard";
import { ProductCard } from "@/components/product/ProductCard";
import { GradeBadge } from "@/components/product/GradeBadge";
import { IkonFlagga } from "@/components/ui/Icons";
import type { Grade } from "@shared/types";

export default function Hem() {
  const { products, loading } = useProducts();
  const iLager = products.filter((p) => p.variants.some((v) => v.stock > 0));
  const utvalda = iLager.slice(0, 4);
  const visaDemoNotis = utvalda.some((p) => p.isDemo);

  return (
    <>
      {/* Hero */}
      <section className="dimples overflow-hidden bg-skog text-white">
        <div className="wrap grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="text-[clamp(4rem,13vw,9rem)]">
              {sv.hem.heroRubrik1}
              <br />
              <span className="text-fairway">{sv.hem.heroRubrik2}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/85">{sv.hem.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="knapp knapp-ljus">{sv.hem.heroKnapp}</Link>
              <Link to="/hur-det-fungerar" className="knapp knapp-kontur">{sv.hem.heroKnapp2}</Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            {products[0] ? <ScoreCard product={products[0]} /> : null}
          </div>
        </div>
      </section>

      {/* Så köper du: en riktig sekvens, därför "hål" 1–3 */}
      <section className="bg-white py-16 md:py-24">
        <div className="wrap">
          <h2 className="text-5xl text-skog md:text-7xl">{sv.hem.stegRubrik}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-0">
            {sv.hem.steg.map((steg, i) => (
              <li key={steg.titel} className="relative md:pr-10">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-skog font-display text-3xl font-extrabold italic text-fairway">
                    {i + 1}
                  </span>
                  {i < 2 && <span aria-hidden className="hidden h-0 flex-1 border-t-2 border-dashed border-gras/40 md:block" />}
                </div>
                <h3 className="mt-5 text-3xl text-skog">{steg.titel}</h3>
                <p className="mt-2 max-w-xs text-skiffer">{steg.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Utvalda produkter */}
      <section className="bg-krita py-16 md:py-24">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-5xl text-skog md:text-7xl">{sv.hem.utvaldaRubrik}</h2>
            <Link to="/shop" className="knapp knapp-mork">{sv.hem.utvaldaAlla}</Link>
          </div>

          {loading ? (
            <p className="mt-10 text-skiffer">{sv.vanlig.laddar}</p>
          ) : (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {utvalda.map((p) => (
                <li key={p.id} className="flex">
                  <div className="flex w-full"><ProductCard product={p} /></div>
                </li>
              ))}
            </ul>
          )}
          {visaDemoNotis && <p className="mt-6 text-sm text-skiffer">{sv.hem.demoNotis}</p>}
        </div>
      </section>

      {/* Grade */}
      <section className="dimples bg-skog-djup py-16 text-white md:py-24">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-5xl md:text-7xl">{sv.hem.gradeRubrik}</h2>
            <p className="mt-5 max-w-sm text-lg text-white/85">{sv.hem.gradeText}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {sv.hem.grader.map((g) => (
              <li key={g.grade} className="flex items-center gap-5 rounded-2xl bg-white/[0.07] p-5">
                <GradeBadge grade={g.grade as Grade} className="!h-14 !w-14 !text-4xl" />
                <div>
                  <h3 className="text-3xl">{g.titel}</h3>
                  <p className="mt-1 text-white/80">{g.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Avslut */}
      <section className="bg-white py-16 md:py-24">
        <div className="wrap flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <IkonFlagga className="mt-2 h-10 w-10 shrink-0 text-gras" />
            <div>
              <h2 className="text-5xl text-skog md:text-7xl">{sv.hem.slutRubrik}</h2>
              <p className="mt-3 text-lg text-skiffer">{sv.slogan} {sv.frakt}.</p>
            </div>
          </div>
          <Link to="/shop" className="knapp knapp-mork text-lg">{sv.hem.slutKnapp}</Link>
        </div>
      </section>
    </>
  );
}
