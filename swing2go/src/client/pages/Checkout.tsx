import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { createOrderSchema } from "@shared/validation";
import { sv } from "@/i18n/sv";
import { useCart } from "@/hooks/useCart";
import { useCartSync } from "@/hooks/useCartSync";
import { ApiFel, skapaOrder } from "@/lib/api";
import { formatKr } from "@/lib/format";
import { Summering } from "@/components/cart/Summering";

interface Formular {
  name: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
}
const tomtFormular: Formular = { name: "", email: "", phone: "", street: "", postalCode: "", city: "" };
const kundSchema = createOrderSchema.shape.customer;

function Falt({
  id,
  etikett,
  fel,
  ...input
}: { id: string; etikett: string; fel?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold text-skog">{etikett}</label>
      <input
        id={id}
        aria-invalid={fel ? true : undefined}
        aria-describedby={fel ? `${id}-fel` : undefined}
        className={`h-12 w-full rounded-xl border-2 bg-white px-4 text-base ${fel ? "border-red-600" : "border-linje focus:border-skog"}`}
        {...input}
      />
      {fel && <p id={`${id}-fel`} className="mt-1.5 text-sm font-semibold text-red-700">{fel}</p>}
    </div>
  );
}

export default function Checkout() {
  const cart = useCart();
  const { kanGaVidare, loading } = useCartSync();
  const [form, setForm] = useState<Formular>(tomtFormular);
  const [fel, setFel] = useState<Record<string, string>>({});
  const [serverFel, setServerFel] = useState<string | null>(null);
  const [skickar, setSkickar] = useState(false);
  const [klar, setKlar] = useState<{ orderNumber: number; totalOre: number } | null>(null);
  const felRuta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (serverFel) felRuta.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [serverFel]);

  function sätt(nyckel: keyof Formular, värde: string) {
    setForm((f) => ({ ...f, [nyckel]: värde }));
    if (fel[nyckel]) setFel((e) => ({ ...e, [nyckel]: "" }));
  }

  async function skicka(e: FormEvent) {
    e.preventDefault();
    setServerFel(null);

    const kund = kundSchema.safeParse({ ...form, phone: form.phone.trim() || undefined });
    if (!kund.success) {
      const nya: Record<string, string> = {};
      for (const i of kund.error.issues) nya[String(i.path[0])] ??= i.message;
      setFel(nya);
      document.getElementById(`f-${Object.keys(nya)[0]}`)?.focus();
      return;
    }
    setFel({});

    setSkickar(true);
    try {
      const svar = await skapaOrder({
        customer: kund.data,
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      });
      cart.clear();
      setKlar(svar);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err instanceof ApiFel) {
        const franServer: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.falt)) franServer[k.replace(/^customer\./, "")] = v;
        setFel(franServer);
        setServerFel(err.message);
      } else {
        setServerFel(sv.vanlig.fel);
      }
    } finally {
      setSkickar(false);
    }
  }

  if (klar) {
    return (
      <section className="dimples bg-skog text-white">
        <div className="wrap py-16 md:py-24">
          <h1 className="text-6xl text-fairway md:text-8xl">{sv.kassa.tackRubrik}</h1>
          <p className="mt-5 text-lg text-white/90">{sv.kassa.tackText}</p>
          <div className="mt-8 inline-block rounded-3xl bg-krita p-6 text-skog">
            <p className="text-sm font-semibold text-gras">{sv.kassa.ordernummer}</p>
            <p className="font-display text-6xl font-extrabold italic leading-none">#{klar.orderNumber}</p>
            <p className="mt-4 font-semibold">{sv.kassa.totalt}: {formatKr(klar.totalOre)}</p>
          </div>
          <p className="mt-6 max-w-md text-white/85">{sv.kassa.sparaNummer}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="knapp knapp-ljus">{sv.kassa.fortsattHandla}</Link>
            <Link to="/" className="knapp knapp-kontur">{sv.kassa.tillHem}</Link>
          </div>
        </div>
      </section>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="dimples-ljus bg-krita">
        <div className="wrap py-20 md:py-28">
          <h1 className="text-6xl text-skog md:text-8xl">{sv.kassa.korgenTom}</h1>
          <Link to="/shop" className="knapp knapp-mork mt-8">{sv.varukorg.tillShop}</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="wrap py-10 md:py-14">
      <h1 className="text-6xl text-skog md:text-8xl">{sv.kassa.rubrik}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        <form onSubmit={skicka} noValidate className="flex flex-col gap-10">
          <div ref={felRuta}>
            {serverFel && (
              <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-900">
                <p className="font-bold">{sv.kassa.felRubrik}</p>
                <p className="mt-1">{serverFel}</p>
                <Link to="/varukorg" className="mt-2 inline-block font-semibold underline underline-offset-4">
                  {sv.nav.varukorg}
                </Link>
              </div>
            )}
            {!loading && !kanGaVidare && !serverFel && (
              <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-900">
                <p>En vara i din varukorg har ändrats eller tagits slut.</p>
                <Link to="/varukorg" className="mt-2 inline-block font-semibold underline underline-offset-4">
                  {sv.nav.varukorg}
                </Link>
              </div>
            )}
          </div>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-4xl font-extrabold italic text-skog font-display">{sv.kassa.kontakt}</legend>
            <Falt id="f-name" etikett={sv.kassa.namn} fel={fel.name} value={form.name} onChange={(e) => sätt("name", e.target.value)} autoComplete="name" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Falt id="f-email" etikett={sv.kassa.epost} fel={fel.email} type="email" inputMode="email" value={form.email} onChange={(e) => sätt("email", e.target.value)} autoComplete="email" />
              <Falt id="f-phone" etikett={sv.kassa.telefon} fel={fel.phone} type="tel" inputMode="tel" value={form.phone} onChange={(e) => sätt("phone", e.target.value)} autoComplete="tel" />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-4xl font-extrabold italic text-skog font-display">{sv.kassa.leverans}</legend>
            <Falt id="f-street" etikett={sv.kassa.adress} fel={fel.street} value={form.street} onChange={(e) => sätt("street", e.target.value)} autoComplete="street-address" />
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <Falt id="f-postalCode" etikett={sv.kassa.postnummer} fel={fel.postalCode} inputMode="numeric" value={form.postalCode} onChange={(e) => sätt("postalCode", e.target.value)} autoComplete="postal-code" />
              <Falt id="f-city" etikett={sv.kassa.ort} fel={fel.city} value={form.city} onChange={(e) => sätt("city", e.target.value)} autoComplete="address-level2" />
            </div>
          </fieldset>

          <p className="rounded-2xl bg-krita p-4 text-skiffer">{sv.kassa.betalning}</p>

          <button type="submit" disabled={skickar || loading || !kanGaVidare} className="knapp knapp-mork text-lg disabled:cursor-not-allowed disabled:opacity-60 sm:self-start sm:px-10">
            {skickar ? sv.kassa.skickar : sv.kassa.lagg}
          </button>
        </form>

        <aside className="h-fit rounded-3xl bg-skog p-6 text-white lg:sticky lg:top-32">
          <h2 className="mb-4 text-3xl">{sv.kassa.sammanfattning}</h2>
          <ul className="mb-5 flex flex-col gap-3 border-b border-white/20 pb-5">
            {cart.lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-3">
                <span>
                  {l.quantity} × {l.name}
                  <span className="block text-sm text-white/75">{sv.produkt.pack(l.packSize)} · Grade {l.grade}</span>
                </span>
                <span className="whitespace-nowrap font-semibold">{formatKr(l.priceOre * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <Summering subtotalOre={cart.subtotalOre} shippingOre={cart.shippingOre} totalOre={cart.totalOre} />
        </aside>
      </div>
    </div>
  );
}
