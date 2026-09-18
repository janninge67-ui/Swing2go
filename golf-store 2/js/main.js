// Swing2GoUF — butikslogik

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SWING2GOUF_CONFIG;

let allProducts = [];
let activeCategory = 'all';
const CART_KEY = 'swing2gouf_cart';

const CATEGORY_LABELS = {
  balls: 'Bollar',
  gear: 'Utrustning',
  apparel: 'Kläder',
};

// ---------- Varukorg: sparning ----------
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

// ---------- Hämta produkter ----------
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
      SUPABASE_ANON_KEY är korrekt inställda i js/config.js, och att
      schema.sql har körts.
    </div>`;
  }
}

// ---------- Rendera sortiment ----------
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

// ---------- Varukorgslogik ----------
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

// ---------- Öppna/stäng varukorg ----------
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
}

// ---------- Kassa ----------
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

// ---------- Hjälpfunktioner ----------
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

// ---------- Kategori-knappar (header, mobilmeny och filterrad hålls i synk) ----------
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

// ---------- Koppla ihop sidan ----------
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  renderCart();

  document.getElementById('cart-button').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);
  document.getElementById('checkout-button').addEventListener('click', goToCheckout);

  // Filterknapparna i katalogens sektionshuvud (behöver inte scrolla, redan synliga).
  document.querySelectorAll('.category-filters button').forEach((btn) => {
    btn.addEventListener('click', () => setActiveCategory(btn.dataset.category));
  });

  // Kategoriknapparna i headern (både desktop-nav och mobilmenyn) ska
  // dessutom scrolla ner till sortimentet.
  document.querySelectorAll('#site-nav button, #mobile-nav button').forEach((btn) => {
    btn.addEventListener('click', () => setActiveCategory(btn.dataset.category, { scrollToCatalog: true }));
  });

  // Hamburgermeny för mobil.
  const menuToggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Diskret skugga under headern när man skrollat ner en bit.
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 4);
  });
});
