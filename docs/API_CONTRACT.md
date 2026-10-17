# API CONTRACT — ecommerce-pro v2

Single source of truth for backend and frontend. Both sides MUST match this exactly.

## Base & envelope

- Base URL: `http://localhost:5000/api` (frontend reads from `VITE_API_URL`)
- Static uploads served at: `http://localhost:5000/uploads/<folder>/<file>`
- Success envelope: `{ "success": true, "data": <any>, "message": "<optional>", "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }`
  (`pagination` only on paginated list endpoints)
- Error envelope: `{ "success": false, "message": "<human readable>", "errors": [<express-validator errors, optional>] }`
- Auth: `Authorization: Bearer <jwt>`
  - Customer token payload: `{ "id": <userId>, "type": "customer" }`
  - Admin token payload: `{ "id": <adminUserId>, "type": "admin", "role": "admin" | "super_admin" }`
- Status codes: 200/201 ok · 400 validation · 401 missing/invalid token · 403 wrong role or blocked · 404 not found · 409 conflict (duplicate email/code) · 429 rate limited · 500 server error

## Conventions

- Dates: ISO strings. Money: numbers in INR (paise NOT used). `slug` fields are URL-safe.
- Product list item shape (used everywhere): `{ id, name, slug, sku, price, mrp, discountPercent, ratingAvg, ratingCount, stock, primaryImage, category: {id,name,slug}, brand: {id,name,slug}|null, isNewArrival, isBestSeller, isFlashSale, flashSalePrice, flashSaleEndsAt }`
- `discountPercent` = round((mrp - price) / mrp * 100), computed in service, returned by API.
- Order statuses: `pending → confirmed → processing → shipped → out_for_delivery → delivered`, plus terminal `cancelled`, `returned`, `refunded`.
  Allowed transitions: pending→confirmed|cancelled · confirmed→processing|cancelled · processing→shipped|cancelled · shipped→out_for_delivery · out_for_delivery→delivered · delivered→returned · any non-delivered→refunded (after payment). Backend validates; frontend shows timeline from `statusHistory`.
- Payment methods: `cod | razorpay | upi | card | netbanking | wallet`. Only `cod` works end-to-end without keys; others go through the Razorpay-ready flow (see Payments).

## Tables (auto-created by each Model.ensureTable() at server startup)

users(id, name, email UNIQUE, phone, password_hash, email_verified TINYINT, status ENUM('active','blocked'), created_at, updated_at)
otps(id, email, otp_hash, purpose ENUM('verify_email','reset_password'), expires_at DATETIME, used TINYINT, created_at)
admin_users(id, name, email UNIQUE, password_hash, role ENUM('admin','super_admin'), status ENUM('active','inactive'), created_at, updated_at)
categories(id, name, slug UNIQUE, parent_id NULLABLE FK→categories.id, image, description, status ENUM('active','inactive'), sort_order, created_at)
brands(id, name, slug UNIQUE, logo, description, status ENUM('active','inactive'), created_at)
products(id, name, slug UNIQUE, sku UNIQUE, category_id FK, subcategory_id NULLABLE FK→categories.id, brand_id NULLABLE FK, description MEDIUMTEXT, short_description, price DECIMAL(10,2), mrp DECIMAL(10,2), gst_percent DECIMAL(5,2) DEFAULT 18, weight_kg DECIMAL(8,3) NULLABLE, dimensions VARCHAR(100) NULLABLE, stock INT, sold_count INT DEFAULT 0, rating_avg DECIMAL(3,2) DEFAULT 0, rating_count INT DEFAULT 0, status ENUM('active','inactive'), is_featured TINYINT, is_new_arrival TINYINT, is_best_seller TINYINT, is_flash_sale TINYINT, flash_sale_price DECIMAL(10,2) NULLABLE, flash_sale_ends_at DATETIME NULLABLE, meta_title, meta_description, created_at, updated_at)
product_images(id, product_id FK CASCADE, image_url, sort_order)
product_variants(id, product_id FK CASCADE, size VARCHAR(50) NULLABLE, color VARCHAR(50) NULLABLE, weight_label VARCHAR(50) NULLABLE, sku VARCHAR(100) NULLABLE, price DECIMAL(10,2) NULLABLE, mrp DECIMAL(10,2) NULLABLE, stock INT DEFAULT 0)
carts(id, user_id UNIQUE FK→users.id CASCADE, created_at, updated_at)
cart_items(id, cart_id FK CASCADE, product_id FK, variant_id NULLABLE FK, qty INT, price DECIMAL(10,2) -- snapshot of unit price, created_at)
wishlists(id, user_id FK CASCADE, product_id FK CASCADE, created_at, UNIQUE(user_id, product_id))
addresses(id, user_id FK CASCADE, full_name, phone, line1, line2 NULLABLE, city, state, pincode VARCHAR(10), country DEFAULT 'India', is_default TINYINT, created_at)
coupons(id, code UNIQUE, type ENUM('percentage','flat'), value DECIMAL(10,2), min_order_amount DECIMAL(10,2) DEFAULT 0, max_discount DECIMAL(10,2) NULLABLE, usage_limit INT NULLABLE, used_count INT DEFAULT 0, first_order_only TINYINT DEFAULT 0, applicable_products JSON NULLABLE -- [productIds], applicable_categories JSON NULLABLE -- [categoryIds], starts_at DATETIME NULLABLE, ends_at DATETIME NULLABLE, status ENUM('active','inactive'))
coupon_usage(id, coupon_id FK, user_id FK, order_id FK, discount_amount DECIMAL(10,2), created_at)
orders(id, order_number UNIQUE e.g. 'EP-20260929-0001', user_id FK, address_id FK, address_snapshot JSON, items_subtotal, discount_amount DEFAULT 0, coupon_id NULLABLE FK, coupon_code NULLABLE, shipping_charge, tax_amount, grand_total, payment_method ENUM('cod','razorpay','upi','card','netbanking','wallet'), payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending', order_status VARCHAR(30) DEFAULT 'pending', tracking_number NULLABLE, customer_notes NULLABLE, created_at, updated_at)
order_items(id, order_id FK CASCADE, product_id FK, variant_id NULLABLE, product_name, variant_label NULLABLE, sku NULLABLE, qty, price, mrp, image_url NULLABLE)
order_status_history(id, order_id FK CASCADE, status VARCHAR(30), note NULLABLE, created_at)
payments(id, order_id FK, provider ENUM('cod','razorpay'), razorpay_order_id NULLABLE, razorpay_payment_id NULLABLE, razorpay_signature NULLABLE, amount, currency DEFAULT 'INR', status ENUM('pending','paid','failed','refunded'), raw_response JSON NULLABLE, created_at)
reviews(id, product_id FK CASCADE, user_id FK CASCADE, rating TINYINT 1-5, title NULLABLE, comment TEXT NULLABLE, status ENUM('pending','approved','rejected') DEFAULT 'pending', created_at, updated_at)
review_images(id, review_id FK CASCADE, image_url)
order_returns(id, order_id FK, user_id FK, reason TEXT, status ENUM('requested','approved','rejected','refunded') DEFAULT 'requested', refund_status VARCHAR(30) NULLABLE, created_at, updated_at)
banners(id, title, subtitle NULLABLE, image, button_text NULLABLE, button_link NULLABLE, position DEFAULT 'home_hero', sort_order DEFAULT 0, starts_at NULLABLE, ends_at NULLABLE, status ENUM('active','inactive'))
shipping_zones(id, name, pincodes TEXT -- comma separated, charge DECIMAL(10,2), free_above DECIMAL(10,2) NULLABLE, estimated_days VARCHAR(50), status ENUM('active','inactive'))
notifications(id, user_id NULLABLE FK→users.id (NULL = broadcast), type VARCHAR(50), title, message TEXT, is_read TINYINT DEFAULT 0, created_at)
cms_pages(id, slug UNIQUE, title, content MEDIUMTEXT, status ENUM('published','draft'))
settings(`key` VARCHAR(100) UNIQUE, `value` TEXT, `group` VARCHAR(50) DEFAULT 'general')
newsletter_subscribers(id, email UNIQUE, status ENUM('subscribed','unsubscribed') DEFAULT 'subscribed', created_at)

Seed data (scripts/seed.js): 1 super_admin (credentials ONLY in README), 5 categories (Electronics, Fashion, Grocery, Beauty, Home) + 2 subcategories each, 5 brands, 12 products (with images rows pointing at generated SVG placeholders, 2-3 variants on some, flags covering featured/new/best-seller/flash-sale), 3 banners, coupons WELCOME10 (10% up to ₹500, min ₹999), FLAT500 (flat ₹500, min ₹4999), SAVE20 (20% up to ₹1000, first-order-only), FIRSTORDER (flat ₹200, first-order-only), 7 CMS pages (about-us, contact-us, privacy-policy, terms-conditions, refund-policy, shipping-policy, faq), shipping zones (2), settings (site_name, logo, contact_email, phone, address, gst_number, currency=INR, tax_percent=18, payment_cod_enabled=1, razorpay keys empty, social links).

## Endpoints

### System
- GET /health → `{ ok: true, time }`

### Auth (customer) — mount /auth
- POST /auth/register { name, email, phone, password } → 201 `{ token, user: {id,name,email,phone} }`; 409 if email exists. Rate limited.
- POST /auth/login { email, password } → `{ token, user }`; 401 wrong creds; 403 if blocked.
- POST /auth/send-otp { email, purpose: verify_email|reset_password } → `{ message }` (in dev, also returns `debugOtp`)
- POST /auth/verify-otp { email, otp, purpose } → `{ message, verified: true }` (verify_email sets users.email_verified=1)
- POST /auth/forgot-password { email } → `{ message }` (always 200, sends reset OTP)
- POST /auth/reset-password { email, otp, newPassword } → `{ message }`
- POST /auth/google { idToken } → 501 `{ message: 'Google login not configured' }` unless GOOGLE_CLIENT_ID set (then verify & upsert user, return token)
- GET /auth/me (customer) → `{ user }` full profile
- PUT /auth/profile (customer) { name, phone } → `{ user }`
- PUT /auth/change-password (customer) { currentPassword, newPassword } → `{ message }`

### Admin auth — mount /admin/auth
- POST /admin/auth/login { email, password } → `{ token, admin: { id, name, email, role } }`
- GET /admin/auth/me (admin) → `{ admin }`

### Customers (admin) — mount /admin/customers  [users module]
- GET /admin/customers?search=&status=&page=&limit= → `{ data: [{id,name,email,phone,status,created_at,ordersCount,totalSpent}], pagination }`
- GET /admin/customers/:id → `{ customer, addresses, orders: [{id,order_number,grand_total,order_status,created_at}], stats: {ordersCount,totalSpent} }`
- PUT /admin/customers/:id/block → `{ message }`
- PUT /admin/customers/:id/unblock → `{ message }`

### Products (public) — mount /products
- GET /products?search=&category=<slug>&subcategory=<slug>&brand=<slug>&minPrice=&maxPrice=&rating=&color=&size=&inStock=true&sort=price_asc|price_desc|newest|popular|rating&page=&limit= → `{ data: [productListItem], pagination }`
- GET /products/featured → `{ data: [...] }` (limit 8)
- GET /products/new-arrivals → `{ data: [...] }` (limit 8)
- GET /products/best-sellers → `{ data: [...] }` (limit 8, order sold_count desc)
- GET /products/flash-sale → `{ data: [...], serverTime }` (is_flash_sale=1, ends_at > now)
- GET /products/suggestions?q= → `{ data: { data: [{name, slug}] (max 8), categories: [{name, slug}], brands: [{name, slug}] } }`
- GET /products/:slug → `{ product: {...full, images:[{id,image_url,sort_order}], variants:[...], category, subcategory, brand, ratingAvg, ratingCount}, related: [productListItem x8], breadcrumbs: [{name,slug}] }`

### Products (admin) — mount /admin/products
- GET /admin/products?search=&category=&status=&page=&limit= → admin rows `{ data, pagination }`
- POST /admin/products (multipart: fields + `images[]` files) → 201 `{ product }`
- GET /admin/products/:id → full product with images+variants
- PUT /admin/products/:id (multipart) → `{ product }`
- DELETE /admin/products/:id → `{ message }`
- PUT /admin/products/:id/status { status: active|inactive } → `{ message }`
- DELETE /admin/products/:id/images/:imageId → `{ message }`

### Categories — mount /categories (public)
- GET /categories → `{ data: tree [{id,name,slug,image,children:[...]}] }` (active only)
- GET /categories/:slug → `{ category, subcategories }`
### Categories (admin) — mount /admin/categories
- GET / → flat list `{ data }`; POST / (multipart `image`) → 201; PUT /:id (multipart) → 200; DELETE /:id → 200 (409 if has products/subcategories); PUT /:id/status

### Brands — mount /brands (public)
- GET /brands → `{ data: [{id,name,slug,logo}] }`
### Brands (admin) — mount /admin/brands — GET / POST / (multipart `logo`) PUT /:id DELETE /:id PUT /:id/status

### Cart — mount /cart (customer)
- GET /cart → `{ cart: { items: [{id, product: productListItem, variant, qty, price, lineTotal}], subtotal, itemCount } }`
- POST /cart/items { productId, variantId?, qty=1 } → `{ cart }`
- PUT /cart/items/:itemId { qty } → `{ cart }` (qty 0 removes)
- DELETE /cart/items/:itemId → `{ cart }`
- DELETE /cart → `{ message }` (clear)

### Wishlist — mount /wishlist (customer)
- GET /wishlist → `{ data: [productListItem] }`
- POST /wishlist { productId } → 201 `{ message }` (409 if exists)
- DELETE /wishlist/:productId → `{ message }`

### Addresses — mount /addresses (customer)
- GET /addresses → `{ data: [...] }`
- POST /addresses { fullName, phone, line1, line2?, city, state, pincode, isDefault? } → 201 `{ address }`
- PUT /addresses/:id → `{ address }`
- DELETE /addresses/:id → `{ message }`
- PUT /addresses/:id/default → `{ message }`

### Coupons — mount /coupons (customer)
- POST /coupons/validate { code, subtotal } → `{ valid: true, coupon: {code,type,value}, discount }` or 400 `{ valid:false, message }`
### Coupons (admin) — mount /admin/coupons
- GET / → `{ data, pagination }`; POST / → 201; GET /:id → `{ coupon, usage: [...] }`; PUT /:id; DELETE /:id; PUT /:id/status

### Checkout & Orders — mount /orders (customer)
- POST /orders/checkout { addressId, couponCode?, paymentMethod, customerNotes? } → 201 `{ order: {id, order_number, grand_total, payment_method, order_status}, payment: { provider, ...(razorpay: {keyId, razorpayOrderId, amount} | cod: {}) } }`
  - Uses server-side cart; validates stock; applies coupon via service; decrements stock; clears cart; creates payments row; creates notification (order_confirmation); order_status=pending (cod) — for razorpay, payment_status=pending until verify.
- GET /orders?status=&page=&limit= → `{ data: [{id,order_number,grand_total,order_status,payment_status,created_at,itemCount,primaryImage}], pagination }`
- GET /orders/:id → `{ order: {..., items:[...], address, statusHistory:[{status,note,created_at}], timeline }, coupon }` (owner only)
- POST /orders/:id/cancel → `{ message, order }` (only cancellable statuses; restocks)
- POST /orders/:id/return { reason } → 201 `{ returnRequest }` (only delivered)

### Payments — mount /payments
- POST /payments/razorpay/order { orderId } (customer, own order) → if RAZORPAY_KEY_ID set: `{ keyId, razorpayOrderId, amount, currency }`; else 400 `{ message: 'Razorpay not configured — use Cash on Delivery' }`
- POST /payments/razorpay/verify { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } → verifies HMAC if secret set; on success sets payment_status=paid, order_status=confirmed; → `{ message, order }`

### Orders (admin) — mount /admin/orders
- GET /admin/orders?status=&search=&page=&limit= → `{ data, pagination }`
- GET /admin/orders/:id → full detail incl. items, address, history, payment, customer
- PUT /admin/orders/:id/status { status, note? } → validates transition, appends history, creates notification → `{ order }`
- PUT /admin/orders/:id/tracking { trackingNumber } → `{ message }`

### Reviews
- GET /products/:slug/reviews?sort=recent|helpful&page= → `{ data: [{id,rating,title,comment,images,userName,created_at}], pagination, summary: {avg,count,buckets} }` (approved only)
- POST /reviews (customer, multipart `images[]`) { productId, rating, title?, comment? } → 201 `{ review }` (status pending)
- PUT /reviews/:id (customer, own) → `{ review }`
- DELETE /reviews/:id (customer, own) → `{ message }`
### Reviews (admin) — mount /admin/reviews
- GET /admin/reviews?status=&page= → `{ data, pagination }`
- PUT /admin/reviews/:id/approve → `{ message }`; PUT /admin/reviews/:id/reject → `{ message }`; DELETE /admin/reviews/:id → `{ message }`

### Banners
- GET /banners?position=home_hero → `{ data: [{id,title,subtitle,image,button_text,button_link}] }` (active + date-valid, ordered)
### Banners (admin) — mount /admin/banners — GET / POST / (multipart `image`) PUT /:id DELETE /:id PUT /:id/status

### Shipping
- GET /shipping/zones → `{ data: [{id,name,charge,free_above,estimated_days}] }` (active)
- POST /shipping/check { pincode } → `{ serviceable: true, zone, charge, freeAbove, estimatedDays }` or `{ serviceable: false }`
### Shipping (admin) — mount /admin/shipping/zones — GET / POST / PUT /:id DELETE /:id PUT /:id/status

### Notifications
- GET /notifications (customer) ?page= → `{ data, pagination, unreadCount }`
- PUT /notifications/:id/read → `{ message }`
- PUT /notifications/read-all → `{ message }`
### Notifications (admin) — mount /admin/notifications
- GET /admin/notifications → `{ data, pagination }`
- POST /admin/notifications { userId?|broadcast: true, type, title, message } → 201

### Reports (admin) — mount /admin/reports
- GET /admin/reports/dashboard → `{ totals: { revenue, todayRevenue, orders, pendingOrders, customers, products, lowStock }, charts: { salesByDay: [{date,revenue,orders}] (last 30d), topProducts: [{name,qty,revenue}] (top 5), topCategories: [{name,revenue}] (top 5) } }`
- GET /admin/reports/sales?from=&to=&group=day|week|month → `{ data: [{period,revenue,orders}] }`
- GET /admin/reports/products?type=best_sellers|low_stock|out_of_stock → `{ data }`
- GET /admin/reports/customers?type=new|repeat|top → `{ data }`
- Any report with `&format=csv` → `text/csv` download

### CMS
- GET /cms/:slug → `{ page: {slug,title,content} }` (published only)
### CMS (admin) — mount /admin/cms — GET / (all incl. drafts) POST / PUT /:id DELETE /:id

### Settings
- GET /settings/public → `{ data: { site_name, logo, favicon, contact_email, phone, address, currency, social_facebook, social_instagram, social_twitter, social_youtube } }`
### Settings (admin) — mount /admin/settings — GET / → `{ data: {key: value} }`; PUT / { key: value, ... } → `{ message }`

### Newsletter
- POST /newsletter/subscribe { email } → 201 `{ message }` (200 if already subscribed)

### Admin users — mount /admin/users (requires admins.view/create/edit/delete)
- GET /admin/users → `{ data }`; POST /admin/users { name,email,password,role_id } → 201; PUT /admin/users/:id { name,role_id,status } → 200; DELETE /admin/users/:id → 200 (cannot delete self, deactivate self, or remove the last super admin; role changes that would demote the last super admin are rejected)

### Roles & permissions (RBAC) — mount /admin/roles
- New `roles` table: id, name, slug (unique), description, permissions (JSON array of `<module>.<action>` keys), is_system (1 = built-in, protected), timestamps. `admin_users.role_id` FK → roles(id), backfilled from the legacy `role` enum on boot.
- GET /admin/roles/permissions → `{ data: { permissions } }` permission catalog (any signed-in admin)
- GET /admin/roles → `{ data: { roles } }` (roles.view); GET /admin/roles/:id (roles.view)
- POST /admin/roles { name, description, permissions[] } → 201 (roles.create); slug auto-generated
- PUT /admin/roles/:id { name, description, permissions[] } → 200 (roles.edit); system roles keep their locked permission set (name/description only)
- DELETE /admin/roles/:id → 200 (roles.delete); system roles cannot be deleted; roles still assigned to team members cannot be deleted
- Every admin route is guarded by `adminAuth` + `requirePermission('<module>.<action>')`; the admin JWT payload carries the resolved permission list and super-admin flag. Frontend hides nav links and route-guards pages via `can()` / `RequirePermission`, but the backend is authoritative.

## Order totals (server-side, single util)
subtotal = Σ item price×qty (variant price override if set) → coupon discount via coupon service (validate min_order, expiry, usage, first-order, applicable products/categories, max_discount cap) → shipping: find zone by pincode (default zone if none; free if subtotal-discount ≥ free_above) → tax = (subtotal - discount) × tax_percent/100 (settings.tax_percent, default 18) → grand_total = subtotal - discount + shipping + tax. All money rounded to 2 decimals.

## Notes for implementers
- Every write endpoint validates input with express-validator (backend) and shows server messages in UI (frontend).
- Uploads: multer, images only (jpeg/png/webp), ≤5MB, stored `backend/uploads/<products|banners|brands|categories|reviews>/`, filename `<timestamp>-<rand>.<ext>`; served via express.static.
- `ensureTable()` in every model runs `CREATE TABLE IF NOT EXISTS`; server.js awaits them in FK order before listen. No schema.sql needed (seed script only inserts data + writes SVG placeholder images).
- Razorpay: backend uses `razorpay` npm package ONLY if keys present; otherwise endpoints return the 400 message above and checkout with paymentMethod=razorpay falls back to creating the order with payment_status=pending + message to pay via COD. Frontend Razorpay button hidden unless settings say enabled AND VITE_RAZORPAY_KEY_ID set; checkout script loads https://checkout.razorpay.com/v1/checkout.js dynamically.
