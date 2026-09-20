import type { Grade, PackSize, Product, Variant } from "@shared/types";
import { GRADES } from "@shared/constants";
import { perBollOre } from "./format";

export type Sortering = "nyast" | "pris-lag" | "pris-hog" | "marke";

export interface ShopFilter {
  sok: string;
  marken: string[];
  grader: Grade[];
  pack: PackSize | null;
  bara_i_lager: boolean;
  /** Högsta pris per boll i öre. null = ingen gräns. */
  maxPerBollOre: number | null;
  sortering: Sortering;
}

export const tomtFilter: ShopFilter = {
  sok: "",
  marken: [],
  grader: [],
  pack: null,
  bara_i_lager: false,
  maxPerBollOre: null,
  sortering: "nyast",
};

const SORTERINGAR: Sortering[] = ["nyast", "pris-lag", "pris-hog", "marke"];

// Filtret lever i webbadressen, så att man kan dela och gå tillbaka i historiken.
export function filterFranParams(p: URLSearchParams): ShopFilter {
  const pack = Number(p.get("pack"));
  const max = Number(p.get("max"));
  const sort = p.get("sortera") as Sortering | null;
  return {
    sok: p.get("sok") ?? "",
    marken: p.getAll("marke"),
    grader: p.getAll("grade").filter((g): g is Grade => (GRADES as readonly string[]).includes(g)),
    pack: pack === 6 || pack === 12 ? pack : null,
    bara_i_lager: p.get("lager") === "1",
    maxPerBollOre: Number.isFinite(max) && max > 0 ? max : null,
    sortering: sort && SORTERINGAR.includes(sort) ? sort : "nyast",
  };
}

export function filterTillParams(f: ShopFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.sok) p.set("sok", f.sok);
  f.marken.forEach((m) => p.append("marke", m));
  f.grader.forEach((g) => p.append("grade", g));
  if (f.pack) p.set("pack", String(f.pack));
  if (f.bara_i_lager) p.set("lager", "1");
  if (f.maxPerBollOre !== null) p.set("max", String(f.maxPerBollOre));
  if (f.sortering !== "nyast") p.set("sortera", f.sortering);
  return p;
}

/** Antal aktiva filter (utan sortering), visas på mobilknappen. */
export function antalAktiva(f: ShopFilter): number {
  return (
    (f.sok ? 1 : 0) +
    f.marken.length +
    f.grader.length +
    (f.pack ? 1 : 0) +
    (f.bara_i_lager ? 1 : 0) +
    (f.maxPerBollOre !== null ? 1 : 0)
  );
}

// "Ö" och "å" ska inte stoppa någon som skriver utan prickar.
function normalisera(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function relevantaVarianter(p: Product, f: ShopFilter): Variant[] {
  return f.pack ? p.variants.filter((v) => v.packSize === f.pack) : p.variants;
}

function lagstaPerBoll(varianter: Variant[]): number {
  return Math.min(...varianter.map(perBollOre));
}

export function tillampaFilter(produkter: Product[], f: ShopFilter): Product[] {
  const ord = normalisera(f.sok).split(/\s+/).filter(Boolean);

  const traffar = produkter.filter((p) => {
    const varianter = relevantaVarianter(p, f);
    if (varianter.length === 0) return false;

    if (ord.length) {
      const text = normalisera(`${p.brand} ${p.model} grade ${p.grade}`);
      if (!ord.every((o) => text.includes(o))) return false;
    }
    if (f.marken.length && !f.marken.includes(p.brand)) return false;
    if (f.grader.length && !f.grader.includes(p.grade)) return false;
    if (f.bara_i_lager && !varianter.some((v) => v.stock > 0)) return false;
    if (f.maxPerBollOre !== null && lagstaPerBoll(varianter) > f.maxPerBollOre) return false;
    return true;
  });

  const sorterad = [...traffar];
  switch (f.sortering) {
    case "pris-lag":
      sorterad.sort((a, b) => lagstaPerBoll(relevantaVarianter(a, f)) - lagstaPerBoll(relevantaVarianter(b, f)));
      break;
    case "pris-hog":
      sorterad.sort((a, b) => lagstaPerBoll(relevantaVarianter(b, f)) - lagstaPerBoll(relevantaVarianter(a, f)));
      break;
    case "marke":
      sorterad.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "sv"));
      break;
    default:
      break; // "nyast": ordningen från databasen (senast tillagd först)
  }
  return sorterad;
}
