import type { Grade } from "@shared/types";

// Grade visas som ett scorekortsmärke.
const stilar: Record<Grade, string> = {
  A: "bg-fairway text-skog-djup",
  B: "bg-krita text-skog border-2 border-skog",
  C: "bg-skiffer text-white",
};

export function GradeBadge({ grade, className = "" }: { grade: Grade; className?: string }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg font-display text-xl font-extrabold italic leading-none ${stilar[grade]} ${className}`}
      title={`Grade ${grade}`}
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}
