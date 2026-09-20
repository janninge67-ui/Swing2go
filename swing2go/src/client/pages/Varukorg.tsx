import { Link } from "react-router-dom";
import { sv } from "@/i18n/sv";
import { useCart } from "@/hooks/useCart";
import { useCartSync } from "@/hooks/useCartSync";
import { formatKr, perBollOre } from "@/lib/format";
import { GradeBadge } from "@/components/product/GradeBadge";
import { Ball } from "@/components/ui/Ball";
import { Summering } from "@/components/cart/Summering";

export default function Varukorg() {
  const cart = useCart();
  const { status, kanGaVidare } = useCartSync();

  if (cart.lines.length === 0) {
    return (
      <section className="dimples-ljus bg-krita">
        <div className="wrap py-20 md:py-28">
          <h1 className="text-6xl text-skog md:text-8xl">{sv.varukorg.tom}</h1>
          <p className="mt-5 max-w-md text-lg text-skiffer">{sv.varukorg.tomText}</p>
          <Link to="/shop" className="knapp knapp-mork mt-8">{sv.varukorg.tillShop}</Link>
        </div>
      </section>
    );
  }

  const steg =
    "flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-skog transition-colors hover:bg-krita disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="wrap py-10 md:py-14">
      <h1 className="text-6xl text-skog md:text-8xl">{sv.varukorg.rubrik}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <ul className="flex flex-col">
          {cart.lines.map((l) => {
            const s = status.get(l.variantId);
            const problem = s && s.typ !== "ok";
            const maxAntal = s?.typ === "forFa" ? s.kvar : 20;
            return (
              <li key={l.variantId} className="flex gap-4 border-b border-linje py-6 first:pt-0">
                <Link
                  to={`/produkt/${l.slug}`}
                  className="dimples-ljus flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-krita sm:h-28 sm:w-28"
                  aria-label={l.name}
                >
                  <Ball className="h-14 w-14" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/produkt/${l.slug}`} className="block font-display text-3xl font-extrabold italic leading-none text-skog hover:underline">
                        {l.name}
                      </Link>
                      <p className="mt-2 flex items-center gap-2 text-skiffer">
                        <GradeBadge grade={l.grade} className="!h-7 !w-7 !text-base" />
                        {sv.produkt.pack(l.packSize)} · {formatKr(perBollOre(l))} {sv.produkt.perBoll}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-lg font-bold text-skog">{formatKr(l.priceOre * l.quantity)}</p>
                  </div>

                  {problem && (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                      {s.typ === "saknas" && sv.varukorg.saknas}
                      {s.typ === "slut" && sv.varukorg.slut}
                      {s.typ === "forFa" && (
                        <>
                          {sv.varukorg.forFa(s.kvar)}{" "}
                          <button type="button" className="underline" onClick={() => cart.setQuantity(l.variantId, s.kvar)}>
                            {sv.varukorg.justera(s.kvar)}
                          </button>
                        </>
                      )}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div role="group" aria-label={`${sv.varukorg.antal}, ${l.name}`} className="flex items-center rounded-full border-2 border-linje">
                      <button type="button" className={steg} aria-label={sv.varukorg.minska} disabled={l.quantity <= 1} onClick={() => cart.setQuantity(l.variantId, l.quantity - 1)}>−</button>
                      <span className="w-8 text-center font-bold">{l.quantity}</span>
                      <button type="button" className={steg} aria-label={sv.varukorg.oka} disabled={l.quantity >= maxAntal} onClick={() => cart.setQuantity(l.variantId, l.quantity + 1)}>+</button>
                    </div>
                    <button type="button" onClick={() => cart.remove(l.variantId)} className="font-semibold text-gras underline underline-offset-4 hover:text-skog">
                      {sv.varukorg.taBort}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-3xl bg-skog p-6 text-white lg:sticky lg:top-32">
          <p className="mb-4 text-sm font-semibold text-white/80">{sv.varukorg.rad(cart.count)}</p>
          <Summering subtotalOre={cart.subtotalOre} shippingOre={cart.shippingOre} totalOre={cart.totalOre} />
          {kanGaVidare ? (
            <Link to="/kassa" className="knapp knapp-ljus mt-6 w-full text-lg">{sv.varukorg.tillKassan}</Link>
          ) : (
            <button type="button" disabled className="knapp mt-6 w-full bg-white/20 text-lg text-white/60">
              {sv.varukorg.tillKassan}
            </button>
          )}
          <Link to="/shop" className="mt-4 block text-center font-semibold text-white/85 underline underline-offset-4">
            {sv.kassa.fortsattHandla}
          </Link>
        </aside>
      </div>
    </div>
  );
}
