// ============================================================
// Grand Dima Hotel QR Menu — Shared Utilities
// ============================================================

// ---------- Supabase client (lazy init) ----------
let _sb = null;
function getSupabase() {
  if (_sb) return _sb;
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ---------- URL params ----------
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function getLocationInfo() {
  const table = getParam('table');
  const room = getParam('room');
  if (table) return { type: 'table', identifier: `table-${table}`, label: `Table ${table}` };
  if (room) return { type: 'room', identifier: `room-${room}`, label: `Room ${room}` };
  return null;
}

// ---------- Cart (localStorage) ----------
const CART_KEY = 'gdh_cart';
const LOCATION_KEY = 'gdh_location';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadges();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.subtotal, 0);
}

function addToCart(item) {
  const cart = getCart();
  // Unique key = item id + stringified addons + special instructions
  const key = item.menu_item_id + JSON.stringify(item.selected_addons || []) + (item.special_instructions || '');
  const existing = cart.find(c => c.key === key);
  if (existing) {
    existing.quantity += item.quantity;
    existing.subtotal = existing.unit_price * existing.quantity;
  } else {
    cart.push({ ...item, key });
  }
  saveCart(cart);
}

function removeFromCart(key) {
  saveCart(getCart().filter(c => c.key !== key));
}

function updateCartItemQty(key, qty) {
  const cart = getCart();
  const item = cart.find(c => c.key === key);
  if (!item) return;
  if (qty <= 0) { removeFromCart(key); return; }
  item.quantity = qty;
  item.subtotal = item.unit_price * qty;
  saveCart(cart);
}

function updateCartBadges() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'block' : 'none';
  });
}

// ---------- Location persistence ----------
function saveLocation(loc) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}
function getSavedLocation() {
  try { return JSON.parse(localStorage.getItem(LOCATION_KEY)); }
  catch { return null; }
}

// ---------- Format helpers ----------
function fmtPrice(n) {
  return `${CURRENCY_SYMBOL} ${Number(n).toFixed(0)}`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ---------- Toast ----------
function toast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- Status metadata ----------
const STATUS_META = {
  Pending: { icon: 'ti-clock', label: 'Pending', next: 'Accepted' },
  Accepted: { icon: 'ti-check', label: 'Accepted', next: 'Preparing' },
  Preparing: { icon: 'ti-chef-hat', label: 'Preparing', next: 'Ready' },
  Ready: { icon: 'ti-bell', label: 'Ready for pickup', next: 'Delivered' },
  Delivered: { icon: 'ti-circle-check', label: 'Delivered', next: null },
  Rejected: { icon: 'ti-x', label: 'Rejected', next: null },
};

// ---------- Debounce ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Escape HTML ----------
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Synthesized Chime Audio Helper ----------
let _audioCtx = null;
function playChimeSound(type = 'success') {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security autoplays)
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }

    const triggerTone = (freq, duration, delay, gainValue = 0.12) => {
      const osc = _audioCtx.createOscillator();
      const gainNode = _audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(_audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, _audioCtx.currentTime + delay);

      gainNode.gain.setValueAtTime(0.0001, _audioCtx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(gainValue, _audioCtx.currentTime + delay + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, _audioCtx.currentTime + delay + duration);

      osc.start(_audioCtx.currentTime + delay);
      osc.stop(_audioCtx.currentTime + delay + duration);
    };

    if (type === 'success') {
      // Gentle ascending arpeggio (C5 -> E5 -> G5 -> C6)
      triggerTone(523.25, 0.45, 0, 0.12);
      triggerTone(659.25, 0.45, 0.08, 0.1);
      triggerTone(783.99, 0.45, 0.16, 0.08);
      triggerTone(1046.50, 0.6, 0.24, 0.14);
    } else if (type === 'click') {
      // Soft high tap click
      triggerTone(1200, 0.08, 0, 0.05);
    } else if (type === 'remove') {
      // Descending warning tones
      triggerTone(329.63, 0.25, 0, 0.1);
      triggerTone(261.63, 0.35, 0.12, 0.1);
    }
  } catch (err) {
    console.warn('Audio synthesized feedback disabled:', err);
  }
}

// ---------- Demo Database Reset ----------
async function resetLocalDB() {
  const sb = getSupabase();

  // 1. Delete all existing database rows sequentially to respect FK constraints
  await sb.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Seed default luxury categories
  const defaultCats = [
    { name: 'Breakfast', icon: 'ti-egg', sort_order: 1 },
    { name: 'Starters', icon: 'ti-salad', sort_order: 2 },
    { name: 'Main Course', icon: 'ti-meat', sort_order: 3 },
    { name: 'Grills', icon: 'ti-flame', sort_order: 4 },
    { name: 'Pasta & Rice', icon: 'ti-bowl', sort_order: 5 },
    { name: 'Soups', icon: 'ti-cup', sort_order: 6 },
    { name: 'Salads', icon: 'ti-leaf', sort_order: 7 },
    { name: 'Desserts', icon: 'ti-ice-cream', sort_order: 8 },
    { name: 'Hot Drinks', icon: 'ti-coffee', sort_order: 9 },
    { name: 'Cold Drinks', icon: 'ti-glass', sort_order: 10 },
    { name: 'Juices', icon: 'ti-lemon', sort_order: 11 }
  ];
  const { data: insertedCats, error: catErr } = await sb.from('categories').insert(defaultCats).select();
  if (catErr) throw catErr;

  // 3. Seed default tables and rooms
  const defaultTables = [
    { identifier: 'table-1', type: 'table', label: 'Table 1' },
    { identifier: 'table-2', type: 'table', label: 'Table 2' },
    { identifier: 'table-3', type: 'table', label: 'Table 3' },
    { identifier: 'table-4', type: 'table', label: 'Table 4' },
    { identifier: 'table-5', type: 'table', label: 'Table 5' },
    { identifier: 'table-6', type: 'table', label: 'Table 6' },
    { identifier: 'table-7', type: 'table', label: 'Table 7' },
    { identifier: 'table-8', type: 'table', label: 'Table 8' },
    { identifier: 'table-9', type: 'table', label: 'Table 9' },
    { identifier: 'table-10', type: 'table', label: 'Table 10' },
    { identifier: 'table-11', type: 'table', label: 'Table 11' },
    { identifier: 'table-12', type: 'table', label: 'Table 12' },
    { identifier: 'room-101', type: 'room', label: 'Room 101' },
    { identifier: 'room-102', type: 'room', label: 'Room 102' },
    { identifier: 'room-201', type: 'room', label: 'Room 201' },
    { identifier: 'room-202', type: 'room', label: 'Room 202' },
    { identifier: 'room-301', type: 'room', label: 'Room 301' },
    { identifier: 'room-302', type: 'room', label: 'Room 302' }
  ];
  const { error: tableErr } = await sb.from('tables').insert(defaultTables);
  if (tableErr) throw tableErr;

  // Map category names to their new database UUIDs
  const catMap = {};
  insertedCats.forEach(c => { catMap[c.name] = c.id; });

  // 4. Seed default menu items
  const defaultItems = [
    { name: 'Grand Dima Full Breakfast', description: 'Eggs, toast, grilled tomato, sausage, mushrooms, bacon & orange juice', price: 280, category_id: catMap['Breakfast'], image_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600', prep_time_minutes: 20, available: true, popular: true, addons: [{ "name": "Extra eggs", "price": 30 }, { "name": "Smoked salmon", "price": 60 }, { "name": "Avocado", "price": 45 }] },
    { name: 'Continental Breakfast', description: 'Croissant, jam, butter, fresh fruit, yogurt & coffee', price: 180, category_id: catMap['Breakfast'], image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600', prep_time_minutes: 10, available: true, popular: false, addons: [{ "name": "Add egg", "price": 25 }] },
    { name: 'Eggs Benedict', description: 'Poached eggs on English muffin with Canadian bacon & hollandaise', price: 220, category_id: catMap['Breakfast'], image_url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600', prep_time_minutes: 15, available: true, popular: true, addons: [{ "name": "Extra hollandaise", "price": 20 }, { "name": "Smoked salmon instead", "price": 40 }] },
    { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, cherry tomatoes, microgreens & poached egg', price: 195, category_id: catMap['Breakfast'], image_url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600', prep_time_minutes: 12, available: true, popular: false, addons: [{ "name": "Extra egg", "price": 25 }, { "name": "Add bacon", "price": 35 }] },

    { name: 'Bruschetta al Pomodoro', description: 'Toasted ciabatta, fresh tomato, basil, garlic & extra virgin olive oil', price: 120, category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600', prep_time_minutes: 8, available: true, popular: false, addons: [] },
    { name: 'Soup of the Day', description: "Ask your waiter for today's selection. Served with artisan bread", price: 140, category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', prep_time_minutes: 10, available: true, popular: false, addons: [{ "name": "Extra bread", "price": 20 }] },
    { name: 'Prawn Cocktail', description: 'Atlantic prawns, Marie Rose sauce, iceberg lettuce, lemon', price: 185, category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', prep_time_minutes: 10, available: true, popular: true, addons: [] },

    { name: 'Grilled Nile Perch', description: 'Pan-seared Nile perch fillet, lemon butter sauce, seasonal vegetables & choice of starch', price: 380, category_id: catMap['Main Course'], image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', prep_time_minutes: 25, available: true, popular: true, addons: [{ "name": "Chips instead of rice", "price": 0 }, { "name": "Extra sauce", "price": 30 }] },
    { name: 'Chicken Tikka Masala', description: 'Tender chicken in rich spiced tomato cream sauce, basmati rice & naan', price: 320, category_id: catMap['Main Course'], image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', prep_time_minutes: 20, available: true, popular: true, addons: [{ "name": "Extra naan", "price": 35 }, { "name": "Extra spicy", "price": 0 }, { "name": "Mild", "price": 0 }] },
    { name: 'Vegetable Biryani', description: 'Aromatic basmati rice with seasonal vegetables, fried onions & raita', price: 260, category_id: catMap['Main Course'], image_url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600', prep_time_minutes: 20, available: true, popular: false, addons: [{ "name": "Add paneer", "price": 50 }, { "name": "Extra raita", "price": 20 }] },

    { name: 'Ribeye Steak 300g', description: 'Prime-cut ribeye, hand-cut chips, grilled tomato, mushrooms & peppercorn sauce', price: 680, category_id: catMap['Grills'], image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600', prep_time_minutes: 30, available: true, popular: true, addons: [{ "name": "Medium rare", "price": 0 }, { "name": "Medium", "price": 0 }, { "name": "Well done", "price": 0 }, { "name": "Extra sauce", "price": 30 }] },
    { name: 'Lamb Chops', description: 'Herb-marinated lamb chops, mint jelly, roasted potatoes & green beans', price: 550, category_id: catMap['Grills'], image_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600', prep_time_minutes: 28, available: true, popular: true, addons: [] },
    { name: 'BBQ Chicken Half', description: 'Slow-grilled half chicken, BBQ glaze, coleslaw & chips', price: 320, category_id: catMap['Grills'], image_url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600', prep_time_minutes: 25, available: true, popular: false, addons: [{ "name": "Extra BBQ sauce", "price": 20 }] },

    { name: 'Spaghetti Carbonara', description: 'Spaghetti, guanciale, egg yolk, pecorino romano, black pepper', price: 280, category_id: catMap['Pasta & Rice'], image_url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600', prep_time_minutes: 18, available: true, popular: true, addons: [{ "name": "Add chicken", "price": 60 }, { "name": "Gluten-free pasta", "price": 30 }] },
    { name: 'Penne Arrabbiata', description: 'Penne in spicy tomato & garlic sauce, fresh basil, parmesan', price: 240, category_id: catMap['Pasta & Rice'], image_url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', prep_time_minutes: 15, available: true, popular: false, addons: [{ "name": "Extra spicy", "price": 0 }, { "name": "Add prawns", "price": 80 }] },

    { name: 'Chocolate Lava Cake', description: 'Warm dark chocolate fondant, vanilla ice cream & berry coulis', price: 180, category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600', prep_time_minutes: 15, available: true, popular: true, addons: [{ "name": "Extra ice cream", "price": 30 }] },
    { name: 'Crème Brûlée', description: 'Classic French vanilla custard with caramelized sugar crust', price: 160, category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600', prep_time_minutes: 10, available: true, popular: false, addons: [] },
    { name: 'Tiramisu', description: 'House-made tiramisu with ladyfingers, mascarpone & espresso', price: 170, category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', prep_time_minutes: 5, available: true, popular: true, addons: [] },

    { name: 'Ethiopian Coffee', description: 'Single-origin Ethiopian arabica, prepared your way', price: 80, category_id: catMap['Hot Drinks'], image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600', prep_time_minutes: 5, available: true, popular: true, addons: [{ "name": "Espresso", "price": 0 }, { "name": "Americano", "price": 0 }, { "name": "Cappuccino", "price": 0 }, { "name": "Latte", "price": 0 }, { "name": "Macchiato", "price": 0 }] },
    { name: 'Masala Chai', description: 'Spiced Indian tea with ginger, cardamom, cinnamon & steamed milk', price: 90, category_id: catMap['Hot Drinks'], image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', prep_time_minutes: 5, available: true, popular: false, addons: [] },
    { name: 'Herbal Tea', description: 'Selection of camomile, peppermint, ginger lemon or green tea', price: 75, category_id: catMap['Hot Drinks'], image_url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600', prep_time_minutes: 3, available: true, popular: false, addons: [] },

    { name: 'Fresh Lemonade', description: 'House-squeezed lemonade, mint & ice', price: 95, category_id: catMap['Cold Drinks'], image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600', prep_time_minutes: 5, available: true, popular: true, addons: [{ "name": "Extra mint", "price": 0 }, { "name": "Sparkling water base", "price": 0 }] },
    { name: 'Still Mineral Water 500ml', description: 'Chilled still mineral water', price: 55, category_id: catMap['Cold Drinks'], image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600', prep_time_minutes: 2, available: true, popular: false, addons: [] },
    { name: 'Sparkling Mineral Water 500ml', description: 'Chilled sparkling mineral water', price: 65, category_id: catMap['Cold Drinks'], image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600', prep_time_minutes: 2, available: true, popular: false, addons: [] },
    { name: 'Coca-Cola / Diet Coke', description: 'Ice cold Coca-Cola or Diet Coke 330ml can', price: 70, category_id: catMap['Cold Drinks'], image_url: 'https://images.unsplash.com/photo-1624517452488-04bba793476f?w=600', prep_time_minutes: 2, available: true, popular: true, addons: [] }
  ];

  const { error: itemErr } = await sb.from('menu_items').insert(defaultItems);
  if (itemErr) throw itemErr;

  return true;
}

// ---------- Theme Management ----------
const THEME_KEY = 'gdh_theme';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  updateToggleIcons(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  if (newTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  localStorage.setItem(THEME_KEY, newTheme);
  updateToggleIcons(newTheme);
}

function updateToggleIcons(theme) {
  const buttons = document.querySelectorAll('#themeToggle');
  buttons.forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'ti ti-sun';
      } else {
        icon.className = 'ti ti-moon';
      }
    }
  });
}

// ---------- Service Worker Registration ----------
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered with scope:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
}

// ---------- Database Query Prefetching ----------
async function prefetchDatabaseData(url) {
  try {
    const path = url.pathname;
    
    // 1. Prefetch menu categories & menu items
    if (path.includes('menu.html') || path === '/' || path === '') {
      const lastFetch = localStorage.getItem('gdh_last_menu_fetch');
      if (lastFetch && Date.now() - parseInt(lastFetch) < 30000) return;

      console.log('[Prefetch] Prefetching categories & menu items...');
      const sb = getSupabase();
      const [{ data: cats }, { data: items }] = await Promise.all([
        sb.from('categories').select('*').order('sort_order'),
        sb.from('menu_items').select('*, categories(name)').eq('available', true)
      ]);

      if (cats && items) {
        localStorage.setItem('gdh_cached_categories', JSON.stringify(cats));
        localStorage.setItem('gdh_cached_menu_items', JSON.stringify(items));
        localStorage.setItem('gdh_last_menu_fetch', Date.now().toString());
        console.log('[Prefetch] Cached categories & menu items.');
      }
    }
    
    // 2. Prefetch item detail specs
    if (path.includes('item.html')) {
      const id = url.searchParams.get('id');
      if (!id) return;
      
      const lastFetch = localStorage.getItem(`gdh_last_item_fetch_${id}`);
      if (lastFetch && Date.now() - parseInt(lastFetch) < 30000) return;

      console.log(`[Prefetch] Prefetching item details for ${id}...`);
      const sb = getSupabase();
      const { data, error } = await sb.from('menu_items').select('*, categories(name)').eq('id', id).single();
      if (data && !error) {
        localStorage.setItem(`gdh_cached_item_${id}`, JSON.stringify(data));
        localStorage.setItem(`gdh_last_item_fetch_${id}`, Date.now().toString());
        console.log(`[Prefetch] Cached item details for ${id}.`);
      }
    }

    // 3. Prefetch active order tracker updates
    if (path.includes('order-status.html')) {
      const history = JSON.parse(localStorage.getItem('gdh_order_history') || '[]');
      if (!history.length) return;

      const lastFetch = localStorage.getItem('gdh_last_orders_fetch');
      if (lastFetch && Date.now() - parseInt(lastFetch) < 15000) return;

      console.log('[Prefetch] Prefetching order status tracker...');
      const sb = getSupabase();
      const { data: orders } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .in('id', history)
        .order('created_at', { ascending: false });

      if (orders) {
        localStorage.setItem('gdh_cached_orders', JSON.stringify(orders));
        localStorage.setItem('gdh_last_orders_fetch', Date.now().toString());
        console.log('[Prefetch] Cached active orders tracker.');
      }
    }
  } catch (err) {
    console.warn('[Prefetch] Error during background prefetch:', err);
  }
}

// ---------- Hover & Touch Link Prefetcher ----------
function initLinkPrefetcher() {
  const htmlPrefetched = new Set();

  function prefetchHTML(urlStr, urlObj) {
    if (htmlPrefetched.has(urlStr)) return;
    htmlPrefetched.add(urlStr);
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = urlStr;
    document.head.appendChild(link);
    
    // Trigger dynamic data prefetching in the background
    prefetchDatabaseData(urlObj);
  }

  function handleHover(e) {
    const a = e.target.closest('a');
    if (!a || !a.href) return;

    try {
      const url = new URL(a.href, window.location.href);
      if (url.origin === window.location.origin) {
        if (url.pathname && !a.href.startsWith('javascript:')) {
          prefetchHTML(url.pathname + url.search, url);
        }
      }
    } catch (err) {
      console.warn('[Prefetcher] Invalid URL for prefetching:', err);
    }
  }

  document.addEventListener('mouseover', handleHover);
  document.addEventListener('touchstart', handleHover, { passive: true });
}

// Auto-run on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerServiceWorker();
  initLinkPrefetcher();

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('#themeToggle') || e.target.closest('.theme-toggle-btn');
    if (btn) {
      toggleTheme();
    }
  });
});