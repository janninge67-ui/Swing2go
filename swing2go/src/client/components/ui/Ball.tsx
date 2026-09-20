import { useId } from "react";

// Illustrerad golfboll. Används som platshållare tills riktiga bilder laddats upp.
const prickar: [number, number][] = [];
for (let rad = 0; rad < 11; rad++) {
  for (let kol = 0; kol < 11; kol++) {
    prickar.push([6 + kol * 8.8 + (rad % 2 ? 4.4 : 0), 6 + rad * 8.8]);
  }
}

export function Ball({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Golfboll">
      <defs>
        <radialGradient id={`g${id}`} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d6c8" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <ellipse cx="52" cy="97" rx="30" ry="3" fill="#151a17" opacity="0.12" />
      <circle cx="50" cy="50" r="46" fill={`url(#g${id})`} />
      <g clipPath={`url(#c${id})`} fill="#151a17" opacity="0.13">
        {prickar.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.3" />
        ))}
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#151a17" strokeOpacity="0.15" />
    </svg>
  );
}
