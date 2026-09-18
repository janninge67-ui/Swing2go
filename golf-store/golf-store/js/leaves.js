// Swing2Go Golf UF — höstlöv
//
// Ren dekoration: löven ligger i ett fixed lager med pointer-events: none,
// så de kan aldrig blockera klick på knappar eller länkar. Respekterar även
// prefers-reduced-motion (se css/style.css) genom att CSS stänger av
// animationen helt för de som föredrar mindre rörelse.

(function () {
  const LEAF_COUNT = 16;

  const LEAF_COLORS = ['#C9622B', '#D9A441', '#A23B2E', '#8B5E34', '#BF7A2A'];

  const LEAF_PATH =
    'M12 2C7 6 3.5 10.5 3.5 14.5 3.5 18.6 7.4 22 12 22s8.5-3.4 8.5-7.5C20.5 10.5 17 6 12 2z';

  function createLeaf() {
    const size = 14 + Math.random() * 14; // 14–28px
    const left = Math.random() * 100; // vw
    const duration = 10 + Math.random() * 9; // 10–19s
    const delay = -Math.random() * 18; // negative = start mid-fall, staggers them
    const drift = (Math.random() * 2 - 1) * 140; // -140..140px sideways drift
    const spin = (Math.random() < 0.5 ? -1 : 1) * (280 + Math.random() * 200);
    const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];

    const wrapper = document.createElement('div');
    wrapper.className = 'leaf';
    wrapper.style.setProperty('--left', `${left}vw`);
    wrapper.style.setProperty('--duration', `${duration}s`);
    wrapper.style.setProperty('--delay', `${delay}s`);
    wrapper.style.setProperty('--drift', `${drift}px`);
    wrapper.style.setProperty('--spin', `${spin}deg`);
    wrapper.style.setProperty('--size', `${size}px`);

    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true">
        <path d="${LEAF_PATH}"/>
        <path d="M12 22V9" stroke="rgba(0,0,0,0.18)" stroke-width="1" fill="none"/>
      </svg>`;

    return wrapper;
  }

  function initLeaves() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = document.createElement('div');
    container.className = 'leaves-container';
    container.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < LEAF_COUNT; i++) {
      container.appendChild(createLeaf());
    }

    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeaves);
  } else {
    initLeaves();
  }
})();
