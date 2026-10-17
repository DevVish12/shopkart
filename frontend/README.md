# ShopKart — Frontend (ecommerce-pro-v2)

Customer storefront + admin panel in one React 18 + Vite app, styled with Tailwind CSS v3.

## Requirements

- Node.js 18+
- Backend running at `http://localhost:5000` (see `API_CONTRACT.md` in `../docs/`)

## Setup

```bash
cd frontend
cp .env.example .env     # adjust VITE_API_URL if needed
npm install
npm run dev              # http://localhost:5173
```

Build for production:

```bash
npm run build            # outputs to dist/
```

## Env variables

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:5000/api` |
| `VITE_RAZORPAY_KEY_ID` | Show the Razorpay checkout button (must match the backend setting; leave empty for COD-only) |

## Routes

- `/` — Home (hero slider, categories, flash sale, featured, brands, new arrivals, best sellers, testimonials)
- `/products` — listing with category/subcategory/brand/price/rating/color/size/availability filters, 5 sort orders, pagination
- `/products/:slug` — details (image zoom gallery, variants, reviews, related, recently viewed)
- `/categories`, `/search?q=`
- `/cart`, `/checkout`, `/order-success/:orderNumber`
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/account/*` — profile, orders, order details (timeline), wishlist, addresses, change password
- `/notifications` — customer notification inbox
- `/about-us`, `/contact-us`, `/privacy-policy`, `/terms-conditions`, `/refund-policy`, `/shipping-policy`, `/faq` — CMS pages
- `/admin/login` and `/admin/*` — full admin panel (dashboard, products, categories, brands, orders, customers, coupons, reviews, banners, shipping, notifications, reports, CMS, settings, admin users)

## Auth tokens

- Customer token → `localStorage.sk_customer_token`
- Admin token → `localStorage.sk_admin_token`

The axios instance in `src/services/api.js` attaches the right token based on the URL prefix (`/admin` = admin token) and clears/redirects on 401.

## Notes

- All API calls match `docs/API_CONTRACT.md` exactly (endpoints, request/response shapes).
- Razorpay: the checkout loads `https://checkout.razorpay.com/v1/checkout.js` dynamically and uses `POST /payments/razorpay/order` + `POST /payments/razorpay/verify`. If no key is configured, only Cash on Delivery is offered.
- Report CSV export downloads via the `&format=csv` API variants with the admin token in the Authorization header.
