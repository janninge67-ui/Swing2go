import { Link } from "react-router-dom";
import { sv } from "@/i18n/sv";

const kolumn = "flex flex-col gap-2";
const lank = "text-white/80 transition-colors hover:text-fairway";

export function Footer() {
  return (
    <footer className="dimples bg-kol text-white">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src="/logo-ljus.png" alt={sv.namn} width={172} height={87} className="h-16 w-auto" />
          <p className="mt-5 font-display text-3xl font-extrabold italic text-fairway">{sv.slogan}</p>
        </div>

        <nav aria-label="Handla" className={kolumn}>
          <p className="mb-1 font-bold text-white">{sv.footer.handla}</p>
          <Link className={lank} to="/shop">{sv.nav.shop}</Link>
          <Link className={lank} to="/varukorg">{sv.nav.varukorg}</Link>
          <Link className={lank} to="/mitt-konto">{sv.nav.konto}</Link>
        </nav>

        <nav aria-label="Information" className={kolumn}>
          <p className="mb-1 font-bold text-white">{sv.footer.info}</p>
          <Link className={lank} to="/hur-det-fungerar">{sv.nav.hur}</Link>
          <Link className={lank} to="/faq">{sv.nav.faq}</Link>
          <Link className={lank} to="/om-oss">{sv.nav.om}</Link>
          <Link className={lank} to="/kontakt">{sv.nav.kontakt}</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-1 py-5 text-sm text-white/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {sv.namn}</p>
          <p>{sv.footer.ufText}</p>
        </div>
      </div>
    </footer>
  );
}
