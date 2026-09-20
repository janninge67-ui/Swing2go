import type { Grade, PackSize } from "@shared/types";
import { sv } from "@/i18n/sv";
import { formatKr } from "@/lib/format";
import type { ShopFilter } from "@/lib/shopFilter";
import { GradeBadge } from "./GradeBadge";

interface Props {
  filter: ShopFilter;
  onChange: (n: Partial<ShopFilter>) => void;
  marken: { namn: string; antal: number }[];
  prisSpann: { min: number; max: number };
}

function vaxla<T>(lista: T[], varde: T): T[] {
  return lista.includes(varde) ? lista.filter((v) => v !== varde) : [...lista, varde];
}

const rubrik = "mb-3 font-bold text-skog";
const grupp = "border-b border-linje py-5 first:pt-0";

export function ShopFilters({ filter, onChange, marken, prisSpann }: Props) {
  const packVal: (PackSize | null)[] = [null, 6, 12];
  const sliderVarde = filter.maxPerBollOre ?? prisSpann.max;

  return (
    <div>
      <fieldset className={grupp}>
        <legend className={rubrik}>{sv.shop.marke}</legend>
        <ul className="flex flex-col gap-1">
          {marken.map((m) => (
            <li key={m.namn}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-skog"
                  checked={filter.marken.includes(m.namn)}
                  onChange={() => onChange({ marken: vaxla(filter.marken, m.namn) })}
                />
                <span className="flex-1">{m.namn}</span>
                <span className="text-sm text-skiffer/70">{m.antal}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className={grupp}>
        <legend className={rubrik}>{sv.shop.grade}</legend>
        <div className="flex gap-2">
          {(["A", "B", "C"] as Grade[]).map((g) => {
            const valt = filter.grader.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={valt}
                aria-label={`Grade ${g}`}
                onClick={() => onChange({ grader: vaxla(filter.grader, g) })}
                className={`flex items-center gap-2 rounded-xl border-2 py-1.5 pl-1.5 pr-4 font-semibold transition-colors ${
                  valt ? "border-skog bg-skog/5" : "border-linje hover:border-skog/50"
                }`}
              >
                <GradeBadge grade={g} />
                <span>{g}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={grupp}>
        <legend className={rubrik}>{sv.shop.pack}</legend>
        <div className="flex flex-wrap gap-2">
          {packVal.map((n) => (
            <button
              key={n ?? "alla"}
              type="button"
              aria-pressed={filter.pack === n}
              onClick={() => onChange({ pack: n })}
              className={`min-h-10 rounded-full px-4 font-bold transition-colors ${
                filter.pack === n ? "bg-skog text-white" : "bg-krita text-skog hover:bg-fairway/40"
              }`}
            >
              {n === null ? sv.shop.allaPack : sv.produkt.pack(n)}
            </button>
          ))}
        </div>
      </fieldset>

      {prisSpann.max > prisSpann.min && (
        <div className={grupp}>
          <label htmlFor="maxpris" className={`${rubrik} flex items-baseline justify-between`}>
            <span>{sv.shop.maxPris}</span>
            <span className="font-display text-2xl font-extrabold italic text-gras">{formatKr(sliderVarde)}</span>
          </label>
          <input
            id="maxpris"
            type="range"
            min={prisSpann.min}
            max={prisSpann.max}
            step={50}
            value={sliderVarde}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ maxPerBollOre: v >= prisSpann.max ? null : v });
            }}
            className="h-2 w-full cursor-pointer accent-skog"
          />
        </div>
      )}

      <div className="py-5">
        <label className="flex min-h-10 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-skog"
            checked={filter.bara_i_lager}
            onChange={(e) => onChange({ bara_i_lager: e.target.checked })}
          />
          <span>{sv.shop.bara}</span>
        </label>
      </div>
    </div>
  );
}
