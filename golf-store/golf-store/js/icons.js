// Swing2GoUF — product art
// Each product references an `icon` key + `accent` color from Supabase.
// Instead of stock photography, every card gets a simple line-drawn icon
// tinted with that product's accent color.

function productIcon(icon, accent) {
  const stroke = accent || '#1B4332';
  const icons = {
    ball: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <circle cx="50" cy="50" r="34" stroke="${stroke}" stroke-width="3"/>
        <circle cx="38" cy="38" r="2.5" fill="${stroke}"/>
        <circle cx="50" cy="34" r="2.5" fill="${stroke}"/>
        <circle cx="62" cy="38" r="2.5" fill="${stroke}"/>
        <circle cx="32" cy="50" r="2.5" fill="${stroke}"/>
        <circle cx="44" cy="48" r="2.5" fill="${stroke}"/>
        <circle cx="56" cy="48" r="2.5" fill="${stroke}"/>
        <circle cx="68" cy="50" r="2.5" fill="${stroke}"/>
        <circle cx="38" cy="62" r="2.5" fill="${stroke}"/>
        <circle cx="50" cy="64" r="2.5" fill="${stroke}"/>
        <circle cx="62" cy="62" r="2.5" fill="${stroke}"/>
        <circle cx="50" cy="50" r="2.5" fill="${stroke}"/>
      </svg>`,
    glove: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <path d="M35 55 V28 a4 4 0 0 1 8 0 v18 M43 46 V22 a4 4 0 0 1 8 0 v24
                 M51 45 V24 a4 4 0 0 1 8 0 v21 M59 47 V30 a4 4 0 0 1 8 0 v20
                 M67 50 v-8 a3.5 3.5 0 0 1 7 0 v20 c0 14 -9 24 -22 24 h-8
                 c-11 0 -19 -8 -19 -19 v-15 a4 4 0 0 1 8 0 v6"
              stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>`,
    tee: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <path d="M50 20 C40 20 34 28 34 35 C34 41 40 44 50 44 C60 44 66 41 66 35 C66 28 60 20 50 20 Z"
              stroke="${stroke}" stroke-width="3"/>
        <line x1="50" y1="44" x2="50" y2="82" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    towel: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <rect x="26" y="22" width="48" height="58" rx="2" stroke="${stroke}" stroke-width="3"/>
        <line x1="26" y1="36" x2="74" y2="36" stroke="${stroke}" stroke-width="2"/>
        <line x1="26" y1="48" x2="74" y2="48" stroke="${stroke}" stroke-width="2"/>
        <line x1="26" y1="60" x2="74" y2="60" stroke="${stroke}" stroke-width="2"/>
        <line x1="26" y1="72" x2="74" y2="72" stroke="${stroke}" stroke-width="2"/>
      </svg>`,
    tool: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <line x1="50" y1="30" x2="50" y2="78" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
        <path d="M36 30 C36 22 44 18 50 18 C56 18 64 22 64 30 C64 36 58 38 50 38 C42 38 36 36 36 30 Z"
              stroke="${stroke}" stroke-width="3"/>
        <line x1="40" y1="46" x2="60" y2="46" stroke="${stroke}" stroke-width="2.5"/>
      </svg>`,
    shirt: `
      <svg viewBox="0 0 100 100" width="64" height="64" fill="none">
        <path d="M38 24 L50 32 L62 24 L78 34 L70 46 L64 42 V78 H36 V42 L30 46 L22 34 Z"
              stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      </svg>`,
  };
  return icons[icon] || icons.ball;
}
