# Ecommerce Backend (Node.js + Express + MySQL)

Full-stack ecommerce platform backend. Modular Controller / Service / Model architecture,
feature-wise modules, tables auto-created on startup via each model's `ensureTable()`.

## Setup

1. Create the MySQL database:
   ```sql
   CREATE DATABASE ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # edit .env — at minimum DB_USER / DB_PASSWORD / DB_NAME / JWT_SECRET
   ```
4. Seed demo data (admin user, categories, brands, 12 products, banners, coupons,
   CMS pages, shipping zones, settings + SVG placeholder images):
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev
   ```
   API base URL: `http://localhost:5000/api` · Health: `http://localhost:5000/health`
   Uploads served at: `http://localhost:5000/uploads/<folder>/<file>`

## Resetting the database

If the schema changed or the database has stale tables from an older version:

```bash
npm run db:fresh   # drops ALL tables and re-creates them from the current schema (deletes all data)
npm run seed       # re-seed demo data afterwards
```

## Admin login (seeded)

- URL: `POST http://localhost:5000/api/admin/auth/login`
- Email: `admin@ecommerce.local`
- Password: `Admin@12345`

## Optional integrations

- **Razorpay**: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
  Without keys, Razorpay endpoints return a clear 400 and checkout falls back to
  creating the order with `payment_status=pending` (pay via COD). COD works end-to-end.
- **Google login**: set `GOOGLE_CLIENT_ID` in `.env` to enable `POST /api/auth/google`
  (verified via Google's tokeninfo endpoint). Without it the endpoint returns 501.
- **Email/OTP**: `utils/mailer.js` is a console-logging stub — wire a real SMTP
  provider using `SMTP_HOST/PORT/USER/PASS` when going live. OTP codes are returned
  as `debugOtp` in API responses while `NODE_ENV=development`.

## API contract

The single source of truth is `../docs/API_CONTRACT.md` — every endpoint, envelope,
status code and the order-totals formula is specified there.
