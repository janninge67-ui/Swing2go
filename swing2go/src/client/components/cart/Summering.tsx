import { sv } from "@/i18n/sv";
import { formatKr } from "@/lib/format";

export function Summering({
  subtotalOre,
  shippingOre,
  totalOre,
}: {
  subtotalOre: number;
  shippingOre: number;
  totalOre: number;
}) {
  return (
    <dl className="flex flex-col gap-2">
      <div className="flex justify-between">
        <dt>{sv.varukorg.delsumma}</dt>
        <dd className="font-semibold">{formatKr(subtotalOre)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>{sv.varukorg.frakt}</dt>
        <dd className="font-semibold">{formatKr(shippingOre)}</dd>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-current/20 pt-3">
        <dt className="text-lg font-bold">{sv.varukorg.totalt}</dt>
        <dd className="font-display text-4xl font-extrabold italic leading-none">{formatKr(totalOre)}</dd>
      </div>
    </dl>
  );
}
