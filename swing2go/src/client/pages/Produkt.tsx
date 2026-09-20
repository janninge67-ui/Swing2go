import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PackSize, Product } from "@shared/types";
import { sv } from "@/i18n/sv";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { formatKr, perBollOre } from "@/lib/format";
import { Ball } from "@/components/ui/Ball";
import { GradeBadge } from "@/components/product/GradeBadge";
import { ProductCard } from "@/components/product/ProductCard";

function lagerText(stock: number) {
  if (stock <= 0) return { text: sv.produkt.slut, klass: "text-skiffer/70" };
  if (stock <= 3) return { text: sv.sida.baraKvar(stock), klass: "text-gras" };
  return { text: sv.produkt.iLager, klass: "text-gras" };
}

function ProduktDetalj({ produkt, fler }: { produkt: Product; fler: Product[] }) {
  const cart = useCart();
  const [valdPack, setValdPack] = useState<PackSize | null>(null);
  const [antal, setAntal] = useState(1);
  const [bild, setBild] = useState(0);
  const [tillagd, setTillagd] = useState(false);

  useEffect(() => {
    document.title = `${produkt.brand} ${produkt.model} – ${sv.namn}`;
    return () => {
      document.title = `${sv.namn} – Begagnade golfbollar. ${sv.slogan}`;
    };
  }, [produkt]);

  const standard = produkt.variants.find((v) => v.stock > 0) ?? produkt.variants[0];
  const variant = produkt.variants.find((v) => v.packSize === valdPack) ?? standard;

  // Tillgängligt = lager minus det som redan ligger i varukorgen.
  const iKorgen = cart.lines.find((l) => l.variantId === variant?.id)?.quantity ?? 0;
  const tillgangligt = variant ? Math.max(0, variant.stock - iKorgen) : 0;
  const maxAntal = Math.min(20, tillgangligt);
  const valtAntal = Math.min(antal, Math.max(1, maxAntal));

  const gradeInfo = sv.hem.grader.find((g) => g.grade === produkt.grade);
  const namn = `${produkt.brand} ${produkt.model}`;

  function valjPack(p: PackSize) {
    setValdPack(p);
    setAntal(1);
    setTillagd(false);
  }

  function laggIKorg() {
    if (!variant || maxAntal < 1) return;
    cart.add(
      {
        variantId: variant.id,
        productId: produkt.id,
        slug: produkt.slug,
        name: namn,
        grade: produkt.grade,
        packSize: variant.packSize,
        priceOre: variant.priceOre,
      },
      valtAntal,
    );
    setAntal(1);
    setTillagd(true);
  }

  const stegKnapp =
    "flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold text-skog transition-colors hover:bg-krita disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <>
      <div className="wrap pt-6">
        <Link to="/shop" className="font-semibold text-gras underline-offset-4 hover:underline">
          ← {sv.sida.tillbaka}
        </Link>
      </div>

      <div className="wrap grid gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        {/* Bilder */}
        <div>
          <div className="dimples-ljus relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-krita">
            <GradeBadge grade={produkt.grade} className="absolute left-5 top-5 !h-11 !w-11 !text-2xl" />
            {produkt.images[bild] ? (
              <img src={produkt.images[bild]} alt={namn} className="h-full w-full object-cover" />
            ) : (
              <Ball className="h-2/3 w-2/3" />
            )}
          </div>
          {produkt.images.length === 0 && produkt.isDemo && (
            <p className="mt-3 text-sm text-skiffer">{sv.sida.illustration}</p>
          )}
          {produkt.images.length > 1 && (
            <ul className="mt-3 flex gap-2">
              {produkt.images.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setBild(i)}
                    aria-label={sv.sida.visaBild(i + 1)}
                    aria-pressed={i === bild}
                    className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${i === bild ? "border-skog" : "border-linje"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Köpruta */}
        <div>
          <p className="font-semibold text-gras">{produkt.brand}</p>
          <h1 className="mt-1 text-6xl text-skog md:text-8xl">{produkt.model}</h1>
          {produkt.isDemo && (
            <p className="mt-3 inline-block rounded-full bg-krita px-3 py-1 text-sm font-semibold text-skiffer">
              {sv.produkt.demo}
            </p>
          )}

          {gradeInfo && (
            <div className="mt-6 flex items-center gap-3">
              <GradeBadge grade={produkt.grade} />
              <p>
                <span className="font-bold text-skog">Grade {produkt.grade}</span>
                <span className="text-skiffer"> · {gradeInfo.titel}</span>
              </p>
            </div>
          )}

          {variant ? (
            <>
              <fieldset className="mt-8">
                <legend className="mb-3 font-bold text-skog">{sv.sida.valjPack}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {produkt.variants.map((v) => {
                    const lager = lagerText(v.stock);
                    return (
                      <label
                        key={v.id}
                        className="group relative block cursor-pointer rounded-2xl border-2 border-linje bg-white p-4 transition-colors hover:border-skog/50 has-[:checked]:border-skog has-[:checked]:bg-skog has-[:checked]:text-white has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fairway"
                      >
                        <input
                          type="radio"
                          name="forpackning"
                          className="sr-only"
                          checked={v.id === variant.id}
                          onChange={() => valjPack(v.packSize)}
                        />
                        <span className="block font-display text-3xl font-extrabold italic leading-none">
                          {sv.produkt.pack(v.packSize)}
                        </span>
                        <span className="mt-3 block text-lg font-bold">{formatKr(v.priceOre)}</span>
                        <span className="block text-sm opacity-80">
                          {formatKr(perBollOre(v))} {sv.produkt.perBoll}
                        </span>
                        <span className={`mt-2 block text-sm font-semibold group-has-[:checked]:text-fairway ${lager.klass}`}>
                          {lager.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Priset uppdateras när förpackning eller antal ändras */}
              <div className="mt-8 rounded-3xl bg-skog p-6 text-white" aria-live="polite">
                <p className="text-sm font-semibold text-white/80">
                  {sv.produkt.pack(variant.packSize)} · {sv.sida.bollar(variant.packSize)}
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-7xl font-extrabold italic leading-none text-fairway">
                    {formatKr(perBollOre(variant))}
                  </span>
                  <span className="font-semibold">{sv.produkt.perBoll}</span>
                </p>
                <p className="mt-4 border-t border-white/20 pt-4 text-lg">
                  <span className="font-bold">
                    {valtAntal > 1 ? `${sv.sida.totalt} (${valtAntal} st): ` : ""}
                    {formatKr(variant.priceOre * valtAntal)}
                  </span>
                  <span className="text-white/75"> · {sv.sida.fraktInfo}</span>
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                {maxAntal > 0 && (
                  <div role="group" aria-label={sv.sida.antal} className="flex items-center rounded-full border-2 border-linje">
                    <button type="button" className={stegKnapp} aria-label={sv.sida.minska} disabled={valtAntal <= 1} onClick={() => { setAntal(valtAntal - 1); setTillagd(false); }}>
                      −
                    </button>
                    <span className="w-10 text-center text-lg font-bold" aria-live="polite">{valtAntal}</span>
                    <button type="button" className={stegKnapp} aria-label={sv.sida.oka} disabled={valtAntal >= maxAntal} onClick={() => { setAntal(valtAntal + 1); setTillagd(false); }}>
                      +
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={laggIKorg}
                  disabled={maxAntal < 1}
                  className="knapp knapp-mork min-w-[14rem] flex-1 text-lg disabled:cursor-not-allowed disabled:bg-linje disabled:text-skiffer"
                >
                  {maxAntal < 1 ? sv.sida.slut : sv.sida.laggIKorg}
                </button>
              </div>

              {variant.stock > 0 && maxAntal < 1 && (
                <p className="mt-3 text-skiffer">{sv.sida.allaIKorg}</p>
              )}

              <div role="status" className="mt-4 min-h-[3.5rem]">
                {tillagd && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-fairway/30 px-5 py-3 font-semibold text-skog-djup">
                    <span>{sv.sida.tillagd}</span>
                    <Link to="/varukorg" className="underline underline-offset-4">{sv.sida.tillKorg}</Link>
                    <Link to="/shop" className="underline underline-offset-4">{sv.sida.fortsatt}</Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="mt-8 rounded-2xl bg-krita p-5 font-semibold text-skiffer">{sv.sida.slut}</p>
          )}

          {produkt.description && <p className="mt-6 max-w-prose text-skiffer">{produkt.description}</p>}

          <dl className="mt-8 divide-y divide-linje border-y border-linje">
            {[
              [sv.sida.marke, produkt.brand],
              [sv.sida.modell, produkt.model],
              [sv.sida.grade, produkt.grade],
              [sv.sida.innehall, produkt.variants.map((v) => sv.produkt.pack(v.packSize)).join(" eller ")],
            ].map(([etikett, varde]) => (
              <div key={etikett} className="flex justify-between gap-4 py-3">
                <dt className="font-semibold text-gras">{etikett}</dt>
                <dd className="text-right font-semibold">{varde}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {fler.length > 0 && (
        <section className="bg-krita py-14 md:py-20">
          <div className="wrap">
            <h2 className="text-5xl text-skog md:text-6xl">{sv.sida.fler}</h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {fler.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

export default function Produkt() {
  const { slug } = useParams();
  const { products, loading, error } = useProducts();

  if (loading) return <p className="wrap py-20 text-skiffer">{sv.vanlig.laddar}</p>;
  if (error) return <p role="alert" className="wrap py-20 text-red-800">{error}</p>;

  const produkt = products.find((p) => p.slug === slug);
  if (!produkt) {
    return (
      <section className="dimples-ljus bg-krita">
        <div className="wrap py-20 md:py-28">
          <h1 className="text-6xl text-skog md:text-8xl">{sv.sida.ejHittadRubrik}</h1>
          <p className="mt-5 max-w-md text-lg text-skiffer">{sv.sida.ejHittadText}</p>
          <Link to="/shop" className="knapp knapp-mork mt-8">{sv.sida.tillbaka}</Link>
        </div>
      </section>
    );
  }

  // Samma märke först, sedan övriga i lager.
  const fler = products
    .filter((p) => p.id !== produkt.id && p.variants.some((v) => v.stock > 0))
    .sort((a, b) => Number(b.brand === produkt.brand) - Number(a.brand === produkt.brand))
    .slice(0, 3);

  // key gör att valen nollställs när man byter produkt.
  return <ProduktDetalj key={produkt.id} produkt={produkt} fler={fler} />;
}
