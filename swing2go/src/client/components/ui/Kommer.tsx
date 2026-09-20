import { Link } from "react-router-dom";
import { sv } from "@/i18n/sv";

export function Kommer({ titel }: { titel: string }) {
  return (
    <section className="dimples-ljus bg-krita">
      <div className="wrap py-20 md:py-28">
        <h1 className="text-6xl text-skog md:text-8xl">{titel}</h1>
        <p className="mt-5 max-w-md text-lg text-skiffer">{sv.vanlig.komStart}</p>
        <Link to="/" className="knapp knapp-mork mt-8">{sv.vanlig.tillHem}</Link>
      </div>
    </section>
  );
}
