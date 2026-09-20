import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { sv } from "@/i18n/sv";
import { useCart } from "@/hooks/useCart";
import { IkonKonto, IkonMeny, IkonSok, IkonStang, IkonVarukorg } from "@/components/ui/Icons";

const lankar = [
  { to: "/shop", text: sv.nav.shop },
  { to: "/hur-det-fungerar", text: sv.nav.hur },
  { to: "/om-oss", text: sv.nav.om },
  { to: "/faq", text: sv.nav.faq },
  { to: "/kontakt", text: sv.nav.kontakt },
];

const ikonKnapp =
  "relative flex h-11 w-11 items-center justify-center rounded-full text-skog transition-colors hover:bg-krita";

export function Header() {
  const [menyOppen, setMenyOppen] = useState(false);
  const [sokOppen, setSokOppen] = useState(false);
  const [sokText, setSokText] = useState("");
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    setMenyOppen(false);
    setSokOppen(false);
  }, [pathname]);

  function sok(e: FormEvent) {
    e.preventDefault();
    const q = sokText.trim();
    navigate(q ? `/shop?sok=${encodeURIComponent(q)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-linje bg-white/95 backdrop-blur">
      <div className="bg-skog py-1.5 text-center text-sm font-semibold text-white">
        {sv.frakt}
      </div>

      <div className="wrap flex h-[4.5rem] items-center justify-between gap-4">
        <Link to="/" aria-label={`${sv.namn}, till startsidan`} className="shrink-0">
          <img src="/logo-farg.png" alt={sv.namn} width={172} height={87} className="h-14 w-auto" />
        </Link>

        <nav aria-label="Huvudmeny" className="hidden items-center gap-1 lg:flex">
          {lankar.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 font-semibold transition-colors ${
                  isActive ? "bg-skog text-white" : "text-skog hover:bg-krita"
                }`
              }
            >
              {l.text}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center">
          <button type="button" className={ikonKnapp} aria-label={sv.nav.sok} aria-expanded={sokOppen} onClick={() => setSokOppen((v) => !v)}>
            <IkonSok />
          </button>
          <Link to="/mitt-konto" className={ikonKnapp} aria-label={sv.nav.konto}>
            <IkonKonto />
          </Link>
          <Link to="/varukorg" className={ikonKnapp} aria-label={`${sv.nav.varukorg}, ${count} varor`}>
            <IkonVarukorg />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-fairway px-1 text-xs font-extrabold text-skog-djup">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            className={`${ikonKnapp} lg:hidden`}
            aria-label={menyOppen ? sv.nav.stang : sv.nav.meny}
            aria-expanded={menyOppen}
            aria-controls="mobilmeny"
            onClick={() => setMenyOppen((v) => !v)}
          >
            {menyOppen ? <IkonStang /> : <IkonMeny />}
          </button>
        </div>
      </div>

      {sokOppen && (
        <form onSubmit={sok} role="search" className="border-t border-linje bg-krita">
          <div className="wrap flex gap-2 py-3">
            <input
              autoFocus
              type="search"
              value={sokText}
              onChange={(e) => setSokText(e.target.value)}
              placeholder={sv.sok.placeholder}
              aria-label={sv.sok.placeholder}
              className="h-12 min-w-0 flex-1 rounded-full border border-linje bg-white px-5 text-base"
            />
            <button type="submit" className="knapp knapp-mork">{sv.sok.knapp}</button>
          </div>
        </form>
      )}

      {menyOppen && (
        <nav id="mobilmeny" aria-label="Mobilmeny" className="border-t border-linje bg-white lg:hidden">
          <div className="wrap flex flex-col py-3">
            {lankar.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `border-b border-linje py-4 font-display text-3xl font-extrabold italic ${
                    isActive ? "text-gras" : "text-skog"
                  }`
                }
              >
                {l.text}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
