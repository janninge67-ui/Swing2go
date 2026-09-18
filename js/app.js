// ===========================================================
// Swing2Go Golf UF — app.js
// Allt sidans JavaScript i en fil: konfiguration, produktikoner,
// butikslogik (katalog/varukorg/kassa) och höstlöv-effekten.
// ===========================================================


// ---------- 1. KONFIGURATION ----------
// Dessa två värden är SÄKRA att vara publika: anon-nyckeln ger bara den
// åtkomst dina Row Level Security-policyer i supabase/schema.sql tillåter
// (läs-only på products-tabellen). Lägg ALDRIG din service_role-nyckel
// eller Stripes secret key här — de hör hemma i Cloudflare Pages
// miljövariabler, och används bara inuti /functions.

const SWING2GOUF_CONFIG = {
  SUPABASE_URL: 'https://sgpxqblaylfctuufcwwv.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncHhxYmxheWxmY3R1dWZjd3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzgwNjgsImV4cCI6MjEwNTI1NDA2OH0.Z9HLoTXtfv6bLwypcviIMIy9QcgdYxbDTmte8JOeboo',
};


// ---------- 2. PRODUKTIKONER ----------
// Varje produkt har en `icon`-nyckel + `accent`-färg från Supabase.
// Istället för stockfoton får varje kort en enkel linjeritad ikon
// tonad med produktens accentfärg.

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


// ---------- 3. BUTIKSLOGIK ----------
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = SWING2GOUF_CONFIG;

  // Om den här sidan inte har ett produktgalleri (t.ex. success.html /
  // cancel.html) finns det inget att göra här — hoppa över helt.
  if (!document.getElementById('product-grid')) return;

  let allProducts = [];
  let activeCategory = 'all';
  const CART_KEY = 'swing2gouf_cart';

  const CATEGORY_LABELS = {
    balls: 'Bollar',
    gear: 'Utrustning',
    apparel: 'Kläder',
  };

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  let cart = loadCart(); // { [produktId]: antal }

  async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*&order=category,name`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error(`Supabase svarade ${res.status}`);
      allProducts = await res.json();
      renderProducts();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="catalog-error">
        Kunde inte ladda sortimentet. Kontrollera att SUPABASE_URL och
        SUPABASE_ANON_KEY är korrekt inställda i js/app.js, och att
        schema.sql har körts.
      </div>`;
    }
  }

  function renderProducts() {
    const grid = document.getElementById('product-grid');
    const list = allProducts.filter(
      (p) => activeCategory === 'all' || p.category === activeCategory
    );

    if (list.length === 0) {
      grid.innerHTML = `<div class="catalog-empty">Inget i den här kategorin än.</div>`;
      return;
    }

    grid.innerHTML = list
      .map((p) => {
        const outOfStock = p.stock <= 0;
        return `
        <article class="product-card">
          <div class="product-art">${productIcon(p.icon, p.accent)}</div>
          <div class="product-category">${categoryLabel(p.category)}</div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="product-footer">
            <span class="product-price">${formatPrice(p.price_cents)}</span>
            <button class="add-to-bag" data-id="${p.id}" ${outOfStock ? 'disabled' : ''}>
              ${outOfStock ? 'Slutsåld' : 'Lägg i varukorgen'}
            </button>
          </div>
          ${outOfStock ? '' : p.stock <= 5 ? `<div class="stock-note">Bara ${p.stock} kvar</div>` : ''}
        </article>`;
      })
      .join('');

    grid.querySelectorAll('.add-to-bag').forEach((btn) => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id));
    });
  }

  function addToCart(productId) {
    cart[productId] = (cart[productId] || 0) + 1;
    saveCart(cart);
    renderCart();
    openCart();
  }

  function changeQty(productId, delta) {
    const next = (cart[productId] || 0) + delta;
    if (next <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = next;
    }
    saveCart(cart);
    renderCart();
  }

  function removeFromCart(productId) {
    delete cart[productId];
    saveCart(cart);
    renderCart();
  }

  function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal-amount');
    const countEl = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-button');

    const entries = Object.entries(cart)
      .map(([id, qty]) => ({ product: allProducts.find((p) => p.id === id), qty }))
      .filter((e) => e.product);

    const totalItems = entries.reduce((sum, e) => sum + e.qty, 0);
    countEl.textContent = totalItems;
    countEl.style.display = totalItems > 0 ? 'inline-flex' : 'none';

    if (entries.length === 0) {
      itemsEl.innerHTML = `<div class="cart-empty">Din varukorg är tom.</div>`;
      subtotalEl.textContent = formatPrice(0);
      checkoutBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;

    let subtotal = 0;
    itemsEl.innerHTML = entries
      .map(({ product, qty }) => {
        subtotal += product.price_cents * qty;
        return `
        <div class="cart-item">
          <div class="cart-item-art">${productIcon(product.icon, product.accent)}</div>
          <div class="cart-item-info">
            <h4>${escapeHtml(product.name)}</h4>
            <div class="cart-item-price">${formatPrice(product.price_cents)} styck</div>
            <div class="qty-stepper">
              <button data-action="dec" data-id="${product.id}" aria-label="Minska antal">−</button>
              <span>${qty}</span>
              <button data-action="inc" data-id="${product.id}" aria-label="Öka antal">+</button>
            </div>
            <button class="remove-item" data-id="${product.id}">Ta bort</button>
          </div>
        </div>`;
      })
      .join('');

    subtotalEl.textContent = formatPrice(subtotal);

    itemsEl.querySelectorAll('[data-action="inc"]').forEach((b) =>
      b.addEventListener('click', () => changeQty(b.dataset.id, 1))
    );
    itemsEl.querySelectorAll('[data-action="dec"]').forEach((b) =>
      b.addEventListener('click', () => changeQty(b.dataset.id, -1))
    );
    itemsEl.querySelectorAll('.remove-item').forEach((b) =>
      b.addEventListener('click', () => removeFromCart(b.dataset.id))
    );
  }

  function openCart() {
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
  }

  function closeCart() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
  }

  async function goToCheckout() {
    const errorEl = document.getElementById('checkout-error');
    errorEl.style.display = 'none';
    const checkoutBtn = document.getElementById('checkout-button');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Omdirigerar…';

    const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Kassan misslyckades');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Något gick fel när kassan skulle startas. Försök igen.';
      errorEl.style.display = 'block';
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Till kassan';
    }
  }

  function formatPrice(cents) {
    return (cents / 100).toLocaleString('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
    });
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || category;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setActiveCategory(category, { scrollToCatalog = false } = {}) {
    activeCategory = category;
    document.querySelectorAll('[data-category]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    renderProducts();
    if (scrollToCatalog) {
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    }
    closeMobileMenu();
  }

  function closeMobileMenu() {
    const mobileNav = document.getElementById('mobile-nav');
    const toggle = document.getElementById('menu-toggle');
    if (!mobileNav || !toggle) return;
    mobileNav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    renderCart();

    document.getElementById('cart-button').addEventListener('click', openCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('checkout-button').addEventListener('click', goToCheckout);

    document.querySelectorAll('.category-filters button').forEach((btn) => {
      btn.addEventListener('click', () => setActiveCategory(btn.dataset.category));
    });

    document.querySelectorAll('#site-nav button, #mobile-nav button').forEach((btn) => {
      btn.addEventListener('click', () => setActiveCategory(btn.dataset.category, { scrollToCatalog: true }));
    });

    const menuToggle = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 4);
    });
  });
})();


// ---------- 4. HÖSTLÖV ----------
// Ren dekoration: löven ligger i ett fixed lager med pointer-events: none,
// så de kan aldrig blockera klick på knappar eller länkar. Stängs av helt
// för besökare som föredrar reducerad rörelse (se css/style.css).
(function () {
  const LEAF_COUNT = 16;
  const LEAF_COLORS = ['#C9622B', '#D9A441', '#A23B2E', '#8B5E34', '#BF7A2A'];
  const LEAF_PATH =
    'M12 2C7 6 3.5 10.5 3.5 14.5 3.5 18.6 7.4 22 12 22s8.5-3.4 8.5-7.5C20.5 10.5 17 6 12 2z';

  function createLeaf() {
    const size = 14 + Math.random() * 14;
    const left = Math.random() * 100;
    const duration = 10 + Math.random() * 9;
    const delay = -Math.random() * 18;
    const drift = (Math.random() * 2 - 1) * 140;
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
