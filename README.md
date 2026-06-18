# Grand Dima Hotel — QR Menu Ordering System

A production-ready, mobile-first QR menu and ordering system for the Grand Dima Hotel restaurant, powered by Supabase.

---

## 📁 File Structure

```
grand-dima-qrmenu/
├── index.html              ← Portal / launcher page
├── menu.html               ← Guest menu (main ordering page)
├── item.html               ← Item detail + addons + cart add
├── cart.html               ← Cart review + checkout
├── order-status.html       ← Guest real-time order tracking
├── kitchen.html            ← Kitchen staff display
├── admin.html              ← Admin dashboard
├── css/
│   └── global.css          ← Shared design system
├── js/
│   ├── config.js           ← ⚠️ Supabase credentials (edit this)
│   └── utils.js            ← Shared helpers (cart, toast, Supabase client)
└── supabase-schema.sql     ← Full DB schema + seed data
```

---

## 🚀 Quick Setup (5 Steps)

### 1. Create a Supabase Project
- Go to https://supabase.com → New Project
- Choose a region close to Ethiopia (e.g. EU West)
- Save your **Project URL** and **anon public key**

### 2. Run the Database Schema
- In Supabase → SQL Editor → New Query
- Paste and run the contents of `supabase-schema.sql`
- This creates all tables, RLS policies, realtime subscriptions, and seed data

### 3. Configure Credentials
Edit `js/config.js`:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 4. Deploy the Files
Upload all files to any static host:
- **Netlify** (recommended): drag-and-drop the folder at netlify.com
- **Vercel**: `vercel deploy`
- **GitHub Pages**: push to repo → Settings → Pages
- **Cloudflare Pages**: instant global CDN

### 5. Generate & Print QR Codes
- Open `admin.html` → QR Codes section
- Set your deployed domain (e.g. `https://menu.granddimahotel.com/menu.html`)
- Download QR PNGs for each table/room
- Print and place at each location

---

## 🔗 QR Code URL Format

| Location | URL |
|---|---|
| Table 5 | `https://yourdomain.com/menu.html?table=5` |
| Room 101 | `https://yourdomain.com/menu.html?room=101` |

The system auto-detects the location from the URL and attaches it to every order.

---

## 👤 User Roles & Pages

| Page | Who uses it |
|---|---|
| `menu.html` | Guests (via QR scan) |
| `item.html` | Guests (item detail) |
| `cart.html` | Guests (checkout) |
| `order-status.html` | Guests (order tracking) |
| `kitchen.html` | Kitchen staff |
| `admin.html` | Restaurant manager / admin |

---

## 📋 Order Lifecycle

```
Guest scans QR
  → Opens menu.html with ?table=X
  → Browses categories / searches items
  → Opens item.html → selects addons, qty, instructions
  → Adds to cart (localStorage)
  → Goes to cart.html → reviews, adds notes
  → Places order → written to Supabase orders + order_items
  → Redirected to order-status.html (real-time tracking)

Kitchen (kitchen.html)
  → Sees new order appear live (Supabase Realtime INSERT)
  → Accepts → Preparing → Ready
  → Guest sees status update in real-time on their phone

Staff / Admin
  → Can also mark order as Delivered
  → Admin can manage full menu, categories, tables, QR codes
```

---

## ⚡ Real-Time Architecture

All real-time updates use **Supabase Realtime (PostgreSQL CDC)**:

| Channel | Who listens | Events |
|---|---|---|
| `guest-order-updates` | `order-status.html` | `UPDATE` on `orders` table |
| `kitchen-realtime` | `kitchen.html` | `INSERT` + `UPDATE` on `orders` |
| `admin-dash` | `admin.html` dashboard | `*` on `orders` |

No polling. No manual refresh needed.

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `categories` | Menu categories (Breakfast, Grills, etc.) |
| `menu_items` | All food & drink items with addons JSON |
| `tables` | Physical tables and hotel rooms |
| `orders` | Each order with status, totals, location |
| `order_items` | Line items per order |

---

## 🔒 Security (Row Level Security)

| Operation | Policy |
|---|---|
| Read categories/menu/tables | Public (no auth) |
| Create orders | Public (no auth required for guests) |
| Read own orders | Public |
| Update order status | Open (restrict by IP/role in production) |
| Manage menu items | Open (add auth check for production) |

**For production:** Add Supabase Auth for staff/admin routes. Update RLS policies to check `auth.jwt() ->> 'role'`.

---

## 🎨 Design System

- **Font:** Playfair Display (headings) + Inter (body)
- **Colors:** Charcoal black, warm gold (#C8A96E), off-white surfaces
- **Theme:** Luxury hotel — dark elegance, gold accents
- **Layout:** Mobile-first, max-width 480px for guest pages, full-width for staff/admin
- **Components:** All defined in `css/global.css`

---

## ⚙️ Configuration Options (`js/config.js`)

```js
const SERVICE_FEE_PERCENT = 0.10;   // 10% service fee
const CURRENCY = 'ETB';              // Currency code
const CURRENCY_SYMBOL = 'ETB';       // Display symbol
const HOTEL_NAME = 'Grand Dima Hotel';
const RESTAURANT_NAME = 'The Grand Restaurant';
```

---

## 🌐 Adding Items via Admin

1. Open `admin.html`
2. Go to **Menu Items** → **Add Item**
3. Fill name, description, price, category, image URL, prep time
4. Add-ons format (JSON):
```json
[
  {"name": "Extra cheese", "price": 30},
  {"name": "Spicy version", "price": 0},
  {"name": "Large portion", "price": 60}
]
```

---

## 📱 Mobile PWA Upgrade (Optional)

Add a `manifest.json` and `service-worker.js` to make this installable as an app:

```json
{
  "name": "Grand Dima Menu",
  "short_name": "GDH Menu",
  "start_url": "/menu.html",
  "display": "standalone",
  "background_color": "#F8F6F2",
  "theme_color": "#C8A96E",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```

---

## 🛠️ Customization Checklist

- [ ] Update `js/config.js` with Supabase credentials
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Add your actual menu items via Admin → Menu Items
- [ ] Upload food photos to Supabase Storage or Cloudinary
- [ ] Set your deployed domain in Admin → QR Codes
- [ ] Download and print QR codes for each table/room
- [ ] Test a full order flow from scan → kitchen → delivery
- [ ] Add Supabase Auth for admin/kitchen login (optional but recommended)

---

## 🤝 Support

Built for **Grand Dima Hotel** — The Grand Restaurant.
Powered by Supabase · Deployed on static hosting.