# Free Deployment Guide — Client Demo (End-to-End Working)

Deploy the full stack — React storefront + Node/Express API + MySQL database —
for **₹0/month, no credit card required**. Verified October 2026.

## Recommended combo (student pack, no card)

| Layer     | Service                          | Why |
|-----------|----------------------------------|-----|
| Frontend  | **Vercel** (Hobby)               | Free, no card. Static React build. |
| Backend   | **Azure App Service** (Student)  | **$100 credit, no credit card required** (GitHub Student Developer Pack). Node 20, no forced sleep, Central India region. GitHub Actions auto-deploy on push. |
| Database  | **TiDB Cloud** Serverless Starter | Free: MySQL-compatible, 5 GB storage, no card needed. Works with this project's `mysql2` driver as-is (`DB_SSL=true`) |

Why Azure? Render needs a card, Koyeb (Oct 2026) is merging into Mistral with no
new services, Zeabur now requires buying/binding a server, Hugging Face made
Docker Spaces PRO-only (Oct 2026), and **Heroku's student offer needs a credit
card on file** (their official FAQ). Azure's student offer explicitly needs
**no card**.

Why not Render's free Postgres? It **expires after 30 days**. TiDB Cloud speaks the
MySQL protocol, so **zero code changes** are needed beyond the connection string.

> Single-service trick: since v10.2, when `SERVE_FRONTEND=true` the backend also
> serves the built React app (`frontend/dist`) on the same origin — no CORS
> config, no wiring two services together. The frontend auto-uses `/api` when
> `VITE_API_URL` is not set and the host isn't localhost.

## Step-by-step

### 1. Push to GitHub
```bash
cd ecommerce-pro-v10
git init
git add .
git add -f backend/uploads   # include seed-generated demo images (gitignored by default)
git commit -m "ShopKart v10.2 - deploy ready"
git push -u origin main
```
Never commit a real `.env`.

### 2. Create the free database (TiDB Cloud)
1. Sign up at tidbcloud.com → Create a **Serverless** cluster (Starter plan,
   spending limit **$0**, region nearest India e.g. Singapore).
2. In SQL Editor run: `CREATE DATABASE ecommerce;`
3. Note the connection details: **host, port (4000), user, password**
   (password is shown once — save it).
4. Networking → make sure an allow-all rule (`0.0.0.0/0`) exists so the app
   server can connect.
5. The project's tables are created automatically on first backend boot
   (`ensureAllTables`), so no manual SQL is needed.

### 3. Deploy the backend on Azure (student, no card)
1. Student Pack page → **Microsoft Azure** offer → claim it (Microsoft account).
2. portal.azure.com → **Create a resource → Web App**:
   - Subscription: *Azure for Students* · Resource group: new, e.g. `shopkart-rg`
   - Name: `shopkart-api` (becomes `shopkart-api.azurewebsites.net`)
   - Runtime stack: **Node 20 LTS** · OS: **Linux** · Region: **Central India**
   - Pricing plan: **Free F1** (₹0; upgrade to B1 later from the $100 credit if needed)
3. Web App → **Overview → Get publish profile** (downloads XML).
4. GitHub repo → **Settings → Secrets and variables → Actions** → add:
   - `AZURE_WEBAPP_NAME` = `shopkart-api`
   - `AZURE_WEBAPP_PUBLISH_PROFILE` = paste the XML
5. Web App → **Configuration → Application settings** → add:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | TiDB host |
   | `DB_PORT` | `4000` |
   | `DB_USER` | TiDB user |
   | `DB_PASSWORD` | TiDB password |
   | `DB_NAME` | `ecommerce` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | any long random string |
   | `FRONTEND_URL` | `*` (demo; tighten to the Vercel URL later) |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | test keys or blank (COD works regardless) |

6. Same page → **General settings** → Startup Command: `npm start` → Save.
   Also turn **Web sockets** ON (needed for Socket.io live updates).
7. Push to GitHub `main` — the included workflow
   (`.github/workflows/azure-deploy.yml`) builds and deploys automatically.
   Check `https://shopkart-api.azurewebsites.net/health`.

### 4. Deploy the frontend on Vercel (no card)
1. Import the same GitHub repo on Vercel.
2. **Root Directory:** `frontend` · Framework preset: **Vite**.
3. Environment variable: `VITE_API_URL=https://shopkart-api.azurewebsites.net/api`
   (Vite bakes this at build time).
4. Deploy → you get `https://<project>.vercel.app`.

### 4. Seed demo data (one time, from your own machine)
```bash
cd backend
# .env pointing at TiDB Cloud (DB_HOST=..., DB_PORT=4000, DB_USER=..., DB_PASSWORD=..., DB_NAME=ecommerce, DB_SSL=true)
npm install
npm run seed
```
This creates tables, an admin user, demo categories/products/banners/coupons and
generates placeholder product images. Then:
```bash
git add -f backend/uploads
git commit -m "Add seeded demo images"
git push   # Azure redeploys with the images included
```

Admin login for the demo: `admin@ecommerce.local` / `Admin@123`
(change it right after the demo).

## Demo-day tips
- **No sleep:** the F1 plan doesn't force-sleep the app (only a daily CPU quota
  applies — plenty for a demo). Open the site 2 minutes before the client call anyway.
- **Uploads are ephemeral**: images uploaded via admin during the
  demo work fine, but vanish on the next redeploy. Commit seed images to Git
  (step 5) for a stable demo; for production use object storage (S3/Cloudinary).
- Socket.io live updates work (Web sockets ON in Configuration).

## Alternatives (all hit walls in Oct 2026)
- **Heroku student offer:** needs a credit card on file (official FAQ).
- **Hugging Face Spaces (Docker):** now PRO-only — needs a paid plan.
- **Zeabur:** new projects require buying or binding a server.
- **Koyeb:** merging into Mistral, no new service creation.
- **Render:** free tier asks for a credit card.
- **Glitch:** app hosting ended July 2025 — not an option.
- The repo still ships a root `Dockerfile` (single-service build, port 7860)
  for any Docker host.

## Alternative: Render Blueprint (needs a credit card)
`render.yaml` is still included — if you later add a card, Render Dashboard →
**New → Blueprint** creates `shopkart-api` + `shopkart-store` from the repo.

## Alternative: Oracle Cloud Always Free (more powerful, more setup)
- 2 AMD VMs free **forever** — nothing sleeps, disk is persistent.
- You install MySQL + Node + Nginx yourself; needs Linux comfort and a credit
  card for signup (not charged). Best when the demo must never cold-start.

## Going to production later
Paid hosting ($7+/mo) removes sleep + ephemeral disk; or move the DB to a managed
MySQL (PlanetScale/Aiven/RDS) and uploads to S3/Cloudinary. No app-code rewrite needed.
