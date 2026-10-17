# ecommerce-pro v2 — Full-Stack Ecommerce (React + Node + MySQL)

Original, product-ready ecommerce source code. All 19 feature sections implemented.

## Stack
- **Frontend:** React 18 + Vite 5 + Tailwind CSS v3 (`frontend/`) — customer storefront + admin panel in one app
- **Backend:** Node.js + Express.js (`backend/`) — modular Controller → Service → Model → MySQL
- **Database:** MySQL via `mysql2/promise`. Tables auto-create on boot — every model has `ensureTable()`
- **Auth:** JWT + bcryptjs · roles: customer + configurable admin roles with per-module permissions (RBAC)

## Quick start
```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE ecommerce_pro;"

# 2. Backend
cd backend
cp .env.example .env        # fill DB_USER / DB_PASSWORD / JWT_SECRET
npm install
node scripts/seed.js        # seeds demo data + prints admin login
npm run dev                 # http://localhost:5000

# 3. Frontend
cd ../frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```
Admin login credentials are printed by the seed script and written in `backend/README.md`.

## Structure
```
ecommerce-pro-v2/
  docs/API_CONTRACT.md      # the exact API contract both sides follow
  backend/src/modules/      # 17 feature modules × {model, service, controller, routes}
  backend/scripts/seed.js   # idempotent demo-data seeder
  frontend/src/pages/       # customer/* + admin/* pages
```

## Notes
- **Razorpay (online payments):** set Key ID + Key Secret in Admin → Settings → Payments and turn it on — no code/env change needed (env vars still work as fallback). Checkout shows the Razorpay option automatically; COD keeps working alongside.
- **Live updates (Socket.io):** new orders appear instantly on admin Orders/Dashboard, and order status changes reflect live on the customer's My Orders page — no reload needed.
- **Promo banners:** Admin → Banners → position "Home promo cards" — up to 3 cards show below the hero on the homepage.
- **Announcement bar:** Admin → Settings → "Announcement Bar" — text, on/off and background color; shows above the navbar on the storefront.
- **Admin roles & permissions:** the admin panel has a `Roles` page — create custom roles and tick exactly which modules each role can view/edit (products, orders, customers, coupons, reviews, shipping, settings, …). Team members are assigned a role from `Team Members`. Built-in roles (Super Admin, Manager, Support) can't be deleted; the backend enforces every permission on each API route, the UI just hides what you can't use.
- Cash on Delivery works fully out of the box. Razorpay activates when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set (backend) and `VITE_RAZORPAY_KEY_ID` (frontend).
- Email OTP uses a console-logging mailer stub — plug in SMTP when ready.
- Google login needs `GOOGLE_CLIENT_ID`, otherwise the endpoint returns 501.
- See `docs/API_CONTRACT.md` for every endpoint, and each folder's README for details.
