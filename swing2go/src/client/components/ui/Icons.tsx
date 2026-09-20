import type { SVGProps } from "react";

const bas = (p: SVGProps<SVGSVGElement>) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IkonSok = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IkonKonto = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
);
export const IkonVarukorg = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const IkonMeny = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IkonStang = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IkonFlagga = (p: SVGProps<SVGSVGElement>) => (
  <svg {...bas(p)}><path d="M6 21V3" /><path d="M6 4h11l-2.5 4L17 12H6" /></svg>
);
