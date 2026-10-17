// Seeds demo data per docs/API_CONTRACT.md. Idempotent — safe to re-run.
// Also generates SVG placeholder images into backend/uploads/products|banners.
// Usage: npm run seed   (ensure DB exists and .env is configured)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/config/db.js';
import { ensureAllTables } from './ensure-tables.js';
import { RoleModel } from '../src/modules/roles/roles.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');
const PRODUCTS_DIR = path.join(BACKEND_ROOT, 'uploads', 'products');
const BANNERS_DIR = path.join(BACKEND_ROOT, 'uploads', 'banners');

const ADMIN_EMAIL = 'admin@ecommerce.local';
const ADMIN_PASSWORD = 'Admin@12345';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const productSvg = (initial, name, bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="${bg}"/><circle cx="400" cy="330" r="160" fill="${fg}" opacity="0.18"/><text x="400" y="410" font-family="Arial, sans-serif" font-size="230" font-weight="bold" text-anchor="middle" fill="${fg}">${esc(initial)}</text><text x="400" y="640" font-family="Arial, sans-serif" font-size="42" text-anchor="middle" fill="#334155">${esc(name)}</text></svg>`;

const bannerSvg = (title, subtitle, c1, c2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="1020" cy="90" r="130" fill="#ffffff" opacity="0.12"/><circle cx="150" cy="330" r="90" fill="#ffffff" opacity="0.10"/><text x="80" y="170" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#ffffff">${esc(title)}</text><text x="80" y="235" font-family="Arial, sans-serif" font-size="34" fill="#ffffff" opacity="0.9">${esc(subtitle)}</text><rect x="80" y="275" width="220" height="56" rx="28" fill="#ffffff"/><text x="190" y="312" font-family="Arial, sans-serif" font-size="26" font-weight="bold" text-anchor="middle" fill="${c2}">Shop Now</text></svg>`;

const CAT_COLORS = {
  electronics: ['#dbeafe', '#1d4ed8'],
  fashion: ['#fce7f3', '#be185d'],
  grocery: ['#dcfce7', '#15803d'],
  beauty: ['#fae8ff', '#a21caf'],
  home: ['#ffedd5', '#c2410c'],
};

async function ensureAdmin() {
  const rows = await query('SELECT id FROM admin_users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]);
  if (rows.length) {
    console.log('[seed] admin user exists, skipping');
    return;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await query('INSERT INTO admin_users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [
    'Super Admin',
    ADMIN_EMAIL,
    hash,
    'super_admin',
    'active',
  ]);
  console.log('[seed] admin user created');
}

async function ensureCategories() {
  const cats = [
    { name: 'Electronics', subs: ['Mobiles', 'Appliances'] },
    { name: 'Fashion', subs: ['Men', 'Women'] },
    { name: 'Grocery', subs: ['Staples', 'Beverages'] },
    { name: 'Beauty', subs: ['Skincare', 'Makeup'] },
    { name: 'Home', subs: ['Furniture', 'Decor'] },
  ];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let order = 1;
  for (const c of cats) {
    let rows = await query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug(c.name)]);
    let parentId;
    if (rows.length) {
      parentId = rows[0].id;
    } else {
      const r = await query(
        "INSERT INTO categories (name, slug, description, status, sort_order) VALUES (?, ?, ?, 'active', ?)",
        [c.name, slug(c.name), `${c.name} products`, order]
      );
      parentId = r.insertId;
    }
    for (const s of c.subs) {
      const srows = await query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug(s)]);
      if (!srows.length) {
        await query(
          "INSERT INTO categories (name, slug, parent_id, description, status, sort_order) VALUES (?, ?, ?, ?, 'active', ?)",
          [s, slug(s), parentId, `${s} products`, order]
        );
      }
    }
    order += 1;
  }
  console.log('[seed] categories ensured');
}

async function ensureBrands() {
  const brands = [
    { name: 'Samsung', desc: 'Consumer electronics and appliances' },
    { name: 'Nike', desc: 'Footwear and apparel' },
    { name: 'Tata Sampann', desc: 'Everyday grocery staples' },
    { name: 'Lakme', desc: 'Beauty and personal care' },
    { name: 'Wakefit', desc: 'Home comfort and furniture' },
  ];
  for (const b of brands) {
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const rows = await query('SELECT id FROM brands WHERE slug = ? LIMIT 1', [slug]);
    if (!rows.length) {
      await query("INSERT INTO brands (name, slug, description, status) VALUES (?, ?, ?, 'active')", [
        b.name,
        slug,
        b.desc,
      ]);
    }
  }
  console.log('[seed] brands ensured');
}

const PRODUCTS = [
  {
    name: 'Samsung Galaxy M35 5G', sku: 'SAM-M35-128', cat: 'electronics', sub: 'mobiles', brand: 'samsung',
    price: 14999, mrp: 18999, gst: 18, stock: 45, sold: 210, short: '6.6" sAMOLED display, 6000mAh battery, 50MP OIS camera',
    desc: 'The Samsung Galaxy M35 5G packs a 6.6-inch sAMOLED display with 120Hz refresh rate, a massive 6000mAh battery for two-day backup, and a 50MP OIS triple camera. Powered by the Exynos 1380 with 5G on both SIMs.',
    featured: 1, newArrival: 0, bestSeller: 1, flash: 0,
    variants: [
      { size: '128GB', color: 'Black', price: 14999, mrp: 18999, stock: 25 },
      { size: '128GB', color: 'Blue', price: 14999, mrp: 18999, stock: 20 },
      { size: '256GB', color: 'Black', price: 16999, mrp: 20999, stock: 12 },
    ],
  },
  {
    name: 'Samsung Galaxy Buds2 Pro', sku: 'SAM-BUDS2P', cat: 'electronics', sub: 'appliances', brand: 'samsung',
    price: 8999, mrp: 12999, gst: 18, stock: 60, sold: 95, short: 'True wireless earbuds with intelligent ANC',
    desc: 'Galaxy Buds2 Pro with intelligent Active Noise Cancellation, 24-bit Hi-Fi audio and a comfortable ergonomic fit. Up to 29 hours of total playtime with the charging case.',
    featured: 0, newArrival: 1, bestSeller: 0, flash: 0, variants: [],
  },
  {
    name: 'Nike Air Zoom Pegasus', sku: 'NIK-PEG-40', cat: 'fashion', sub: 'men', brand: 'nike',
    price: 7995, mrp: 10995, gst: 18, stock: 30, sold: 180, short: 'Responsive running shoes with Zoom Air cushioning',
    desc: 'A workhorse trainer with responsive Zoom Air cushioning and engineered mesh for breathability. Ideal for daily runs and long training miles.',
    featured: 0, newArrival: 0, bestSeller: 1, flash: 0,
    variants: [
      { size: 'UK 8', color: 'Black', price: 7995, mrp: 10995, stock: 10 },
      { size: 'UK 9', color: 'Black', price: 7995, mrp: 10995, stock: 12 },
      { size: 'UK 10', color: 'White', price: 7995, mrp: 10995, stock: 8 },
    ],
  },
  {
    name: 'Nike Dri-FIT Training T-Shirt', sku: 'NIK-DRIFIT-TS', cat: 'fashion', sub: 'women', brand: 'nike',
    price: 1499, mrp: 2499, gst: 18, stock: 80, sold: 120, short: 'Sweat-wicking training tee',
    desc: 'Stay dry and comfortable with Nike Dri-FIT technology that wicks sweat away from your skin. Lightweight knit with a standard athletic fit.',
    featured: 0, newArrival: 1, bestSeller: 0, flash: 0,
    variants: [
      { size: 'S', color: 'Pink', price: 1499, mrp: 2499, stock: 20 },
      { size: 'M', color: 'Pink', price: 1499, mrp: 2499, stock: 25 },
      { size: 'L', color: 'Grey', price: 1499, mrp: 2499, stock: 20 },
    ],
  },
  {
    name: 'Tata Sampann Toor Dal 1kg', sku: 'TATA-TOOR-1K', cat: 'grocery', sub: 'staples', brand: 'tata-sampann',
    price: 189, mrp: 240, gst: 5, stock: 200, sold: 540, short: 'Unpolished protein-rich toor dal',
    desc: 'Tata Sampann unpolished toor dal is sourced from the finest farms and goes through a 5-step quality process. Rich in protein, cooks evenly and tastes delicious.',
    featured: 0, newArrival: 0, bestSeller: 1, flash: 0,
    variants: [
      { weight_label: '1 kg', price: 189, mrp: 240, stock: 120 },
      { weight_label: '5 kg', price: 899, mrp: 1150, stock: 60 },
    ],
  },
  {
    name: 'Tata Tea Gold 500g', sku: 'TATA-TEA-500', cat: 'grocery', sub: 'beverages', brand: 'tata-sampann',
    price: 285, mrp: 340, gst: 5, stock: 150, sold: 320, short: 'Rich Assam tea blend with long-lasting aroma',
    desc: 'Tata Tea Gold blends the finest Assam teas for a rich taste and irresistible aroma that lasts. A perfect cup to start your morning.',
    featured: 0, newArrival: 0, bestSeller: 0, flash: 0, variants: [],
  },
  {
    name: 'Lakme Absolute Matte Lipstick', sku: 'LAK-LIP-RED', cat: 'beauty', sub: 'makeup', brand: 'lakme',
    price: 749, mrp: 899, gst: 18, stock: 70, sold: 150, short: 'Intense matte colour, 12-hour wear',
    desc: 'Lakme Absolute Matte Revolution lipstick delivers intense colour with a weightless matte finish. Enriched with vitamin E for comfortable all-day wear.',
    featured: 1, newArrival: 0, bestSeller: 0, flash: 0,
    variants: [
      { color: 'Red', price: 749, mrp: 899, stock: 30 },
      { color: 'Maroon', price: 749, mrp: 899, stock: 25 },
      { color: 'Nude', price: 749, mrp: 899, stock: 15 },
    ],
  },
  {
    name: 'Lakme Sun Expert SPF 50', sku: 'LAK-SUN-50', cat: 'beauty', sub: 'skincare', brand: 'lakme',
    price: 399, mrp: 499, gst: 18, stock: 90, sold: 110, short: 'Lightweight sunscreen, no white cast',
    desc: 'Lakme Sun Expert SPF 50 PA+++ is a lightweight, non-sticky sunscreen that shields skin from UVA/UVB rays without a white cast. Suitable for all skin types.',
    featured: 0, newArrival: 1, bestSeller: 0, flash: 0, variants: [],
  },
  {
    name: 'Wakefit Ortho Memory Foam Mattress', sku: 'WAK-ORTHO-QN', cat: 'home', sub: 'furniture', brand: 'wakefit',
    price: 6999, mrp: 10999, gst: 18, stock: 25, sold: 140, short: 'Queen-size orthopaedic mattress, 6 inch',
    desc: 'Wakefit Ortho mattress combines memory foam with high-resilience support foam for spinal alignment and pressure relief. 10-year warranty with free doorstep delivery.',
    featured: 1, newArrival: 0, bestSeller: 0, flash: 0,
    variants: [
      { size: 'Queen (60x78)', price: 6999, mrp: 10999, stock: 15 },
      { size: 'King (72x78)', price: 8499, mrp: 12999, stock: 10 },
    ],
  },
  {
    name: 'Wakefit Cotton Bedsheet Set', sku: 'WAK-SHEET-KG', cat: 'home', sub: 'decor', brand: 'wakefit',
    price: 999, mrp: 1799, gst: 18, stock: 65, sold: 90, short: '144 TC glaced cotton king bedsheet with 2 pillows',
    desc: 'Premium 144 TC glaced cotton bedsheet set with two pillow covers. Fade-resistant colours and a soft, breathable weave for restful sleep.',
    featured: 0, newArrival: 0, bestSeller: 0, flash: 0, variants: [],
  },
  {
    name: 'Samsung 253L Double Door Refrigerator', sku: 'SAM-REF-253', cat: 'electronics', sub: 'appliances', brand: 'samsung',
    price: 28990, mrp: 35900, gst: 18, stock: 18, sold: 75, short: 'Convertible 5-in-1, digital inverter compressor',
    desc: 'Samsung 253L double door refrigerator with Convertible 5-in-1 modes, digital inverter compressor for energy savings, and stabilizer-free operation.',
    featured: 0, newArrival: 0, bestSeller: 0, flash: 1, flashPrice: 26490, flashDays: 2, variants: [],
  },
  {
    name: 'Nike Heritage Backpack 25L', sku: 'NIK-BAG-25L', cat: 'fashion', sub: 'men', brand: 'nike',
    price: 1999, mrp: 2999, gst: 18, stock: 50, sold: 85, short: 'Durable 25L backpack with laptop sleeve',
    desc: 'A classic 25L backpack with padded 15-inch laptop sleeve, multiple organizer pockets and breathable back panel for all-day comfort.',
    featured: 0, newArrival: 0, bestSeller: 0, flash: 1, flashPrice: 1699, flashDays: 3, variants: [],
  },
];

async function ensureProducts() {
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  const catId = async (slug) => (await query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]))[0]?.id;
  const brandId = async (slug) => (await query('SELECT id FROM brands WHERE slug = ? LIMIT 1', [slug]))[0]?.id;
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  for (const p of PRODUCTS) {
    const existing = await query('SELECT id FROM products WHERE sku = ? LIMIT 1', [p.sku]);
    if (existing.length) continue;
    const category_id = await catId(p.cat);
    const subcategory_id = await catId(p.sub);
    const brand_id = await brandId(p.brand);
    let slug = slugify(p.name);
    const slugTaken = await query('SELECT id FROM products WHERE slug = ? LIMIT 1', [slug]);
    if (slugTaken.length) slug = `${slug}-${p.sku.toLowerCase()}`;

    let flashEnds = null;
    if (p.flash) {
      const d = new Date();
      d.setDate(d.getDate() + p.flashDays);
      flashEnds = d.toISOString().slice(0, 19).replace('T', ' ');
    }

    const r = await query(
      `INSERT INTO products (name, slug, sku, category_id, subcategory_id, brand_id, description, short_description,
        price, mrp, gst_percent, stock, sold_count, status, is_featured, is_new_arrival, is_best_seller,
        is_flash_sale, flash_sale_price, flash_sale_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [p.name, slug, p.sku, category_id, subcategory_id, brand_id, p.desc, p.short, p.price, p.mrp,
        p.gst, p.stock, p.sold, p.featured, p.newArrival, p.bestSeller, p.flash ? 1 : 0,
        p.flash ? p.flashPrice : null, flashEnds]
    );
    const productId = r.insertId;

    // SVG placeholder images
    const [bg, fg] = CAT_COLORS[p.cat] || ['#e2e8f0', '#475569'];
    const initial = p.name.replace(/^[^A-Za-z]*/, '').charAt(0).toUpperCase() || 'P';
    const file1 = `product-${productId}.svg`;
    fs.writeFileSync(path.join(PRODUCTS_DIR, file1), productSvg(initial, p.name, bg, fg));
    await query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)', [
      productId,
      `uploads/products/${file1}`,
    ]);
    if (p.featured) {
      const file2 = `product-${productId}-b.svg`;
      fs.writeFileSync(path.join(PRODUCTS_DIR, file2), productSvg(initial, `${p.name} — lifestyle`, fg + '22', fg));
      await query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 1)', [
        productId,
        `uploads/products/${file2}`,
      ]);
    }

    for (const v of p.variants || []) {
      await query(
        `INSERT INTO product_variants (product_id, size, color, weight_label, sku, price, mrp, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, v.size || null, v.color || null, v.weight_label || null,
          v.sku || `${p.sku}-V${Math.round(Math.random() * 999)}`,
          v.price ?? null, v.mrp ?? null, v.stock || 0]
      );
    }
    console.log(`[seed] product: ${p.name}`);
  }
}

async function ensureBanners() {
  fs.mkdirSync(BANNERS_DIR, { recursive: true });
  const banners = [
    { title: 'Mega Electronics Sale', subtitle: 'Up to 40% off on top brands', c: ['#1e3a8a', '#3b82f6'], link: '/products?category=electronics', order: 1 },
    { title: 'Fashion Fest', subtitle: 'New season styles from Rs. 499', c: ['#831843', '#ec4899'], link: '/products?category=fashion', order: 2 },
    { title: 'Home Makeover Days', subtitle: 'Furniture & decor up to 35% off', c: ['#7c2d12', '#f97316'], link: '/products?category=home', order: 3 },
  ];
  for (const b of banners) {
    const rows = await query('SELECT id FROM banners WHERE title = ? LIMIT 1', [b.title]);
    if (rows.length) continue;
    const file = `banner-${b.order}.svg`;
    fs.writeFileSync(path.join(BANNERS_DIR, file), bannerSvg(b.title, b.subtitle, b.c[0], b.c[1]));
    await query(
      `INSERT INTO banners (title, subtitle, image, button_text, button_link, position, sort_order, status)
       VALUES (?, ?, ?, 'Shop Now', ?, 'home_hero', ?, 'active')`,
      [b.title, b.subtitle, `uploads/banners/${file}`, b.link, b.order]
    );
  }
  console.log('[seed] banners ensured');
}

async function ensureCoupons() {
  const coupons = [
    { code: 'WELCOME10', type: 'percentage', value: 10, min: 999, max: 500, limit: null, first: 0 },
    { code: 'FLAT500', type: 'flat', value: 500, min: 4999, max: null, limit: null, first: 0 },
    { code: 'SAVE20', type: 'percentage', value: 20, min: 1499, max: 1000, limit: null, first: 1 },
    { code: 'FIRSTORDER', type: 'flat', value: 200, min: 499, max: null, limit: null, first: 1 },
  ];
  for (const c of coupons) {
    const rows = await query('SELECT id FROM coupons WHERE code = ? LIMIT 1', [c.code]);
    if (rows.length) continue;
    await query(
      `INSERT INTO coupons (code, type, value, min_order_amount, max_discount, usage_limit, first_order_only, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [c.code, c.type, c.value, c.min, c.max, c.limit, c.first]
    );
  }
  console.log('[seed] coupons ensured');
}

const CMS_PAGES = [
  {
    slug: 'about-us', title: 'About Us',
    content: `<h2>About ShopKart</h2><p>ShopKart is a full-featured online shopping destination bringing quality products across electronics, fashion, grocery, beauty and home essentials to your doorstep. We partner directly with trusted brands to offer genuine products at honest prices.</p><p>Our mission is simple: make online shopping fast, safe and delightful for every Indian household — with easy returns, secure payments including Cash on Delivery, and support that actually helps.</p>`,
  },
  {
    slug: 'contact-us', title: 'Contact Us',
    content: `<h2>Contact Us</h2><p>We would love to hear from you.</p><p><strong>Email:</strong> support@shopkart.in<br><strong>Phone:</strong> +91 98765 43210 (Mon–Sat, 9am–7pm IST)<br><strong>Address:</strong> 4th Floor, Trade Tower, Andheri East, Mumbai 400069</p><p>For order issues, please keep your order number handy (e.g. EP-20260929-0001).</p>`,
  },
  {
    slug: 'privacy-policy', title: 'Privacy Policy',
    content: `<h2>Privacy Policy</h2><p>We collect only the information needed to fulfil your orders: name, contact details, delivery address and order history. Payment details are processed by secure payment gateways and never stored on our servers.</p><p>We do not sell your personal data. You may request a copy or deletion of your data anytime by writing to support@shopkart.in.</p>`,
  },
  {
    slug: 'terms-conditions', title: 'Terms & Conditions',
    content: `<h2>Terms & Conditions</h2><p>By using ShopKart you agree to the following: product prices and availability may change without notice; orders are confirmed subject to stock; Cash on Delivery is available on eligible pincodes; coupons cannot be combined unless stated.</p><p>Misuse of coupons, fake orders or payment fraud may lead to order cancellation and account suspension.</p>`,
  },
  {
    slug: 'refund-policy', title: 'Refund Policy',
    content: `<h2>Refund Policy</h2><p>Easy 7-day returns on most products. Once your return is received and inspected, refunds are initiated within 48 hours: prepaid orders are refunded to the original payment method (5–7 working days), COD orders via bank transfer/UPI.</p><p>Shipping charges are non-refundable unless the return is due to our error (wrong/damaged item).</p>`,
  },
  {
    slug: 'shipping-policy', title: 'Shipping Policy',
    content: `<h2>Shipping Policy</h2><p>Orders are dispatched within 24–48 hours. Metro cities: 2–3 days delivery; rest of India: 4–7 days. Shipping is Rs. 49 for metros (free above Rs. 499) and Rs. 79 elsewhere (free above Rs. 999).</p><p>You can track every order from My Account → Orders.</p>`,
  },
  {
    slug: 'faq', title: 'FAQ',
    content: `<h2>Frequently Asked Questions</h2><p><strong>How do I track my order?</strong><br>Go to My Account → Orders and open the order to see the live timeline.</p><p><strong>What payment methods do you accept?</strong><br>Cash on Delivery, UPI, cards, net banking and wallets via Razorpay.</p><p><strong>How do returns work?</strong><br>Open the delivered order and tap Return, tell us the reason, and we will arrange a pickup.</p>`,
  },
];

async function ensureCms() {
  for (const p of CMS_PAGES) {
    const rows = await query('SELECT id FROM cms_pages WHERE slug = ? LIMIT 1', [p.slug]);
    if (rows.length) continue;
    await query("INSERT INTO cms_pages (slug, title, content, status) VALUES (?, ?, ?, 'published')", [
      p.slug,
      p.title,
      p.content,
    ]);
  }
  console.log('[seed] CMS pages ensured');
}

async function ensureShipping() {
  const zones = [
    { name: 'Metro Express', pincodes: '400001,400002,110001,110002,560001,560002,600001,700001', charge: 49, free: 499, days: '2-3 days' },
    { name: 'Default', pincodes: '', charge: 79, free: 999, days: '4-7 days' },
  ];
  for (const z of zones) {
    const rows = await query('SELECT id FROM shipping_zones WHERE name = ? LIMIT 1', [z.name]);
    if (rows.length) continue;
    await query(
      "INSERT INTO shipping_zones (name, pincodes, charge, free_above, estimated_days, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [z.name, z.pincodes, z.charge, z.free, z.days]
    );
  }
  console.log('[seed] shipping zones ensured');
}

async function ensureSettings() {
  const settings = {
    site_name: 'ShopKart',
    logo: '',
    favicon: '',
    contact_email: 'support@shopkart.in',
    phone: '+91 98765 43210',
    address: '4th Floor, Trade Tower, Andheri East, Mumbai 400069',
    gst_number: '27ABCDE1234F1Z5',
    currency: 'INR',
    tax_percent: '18',
    payment_cod_enabled: '1',
    razorpay_enabled: '0',
    razorpay_key_id: '',
    razorpay_key_secret: '',
    social_facebook: 'https://facebook.com/shopkart',
    social_instagram: 'https://instagram.com/shopkart',
    social_twitter: 'https://x.com/shopkart',
    social_youtube: 'https://youtube.com/@shopkart',
    announcement_enabled: '0',
    announcement_text: 'Free shipping on orders above ₹999!',
    announcement_bg: '#7c3aed',
    theme_name: 'green',
  };
  for (const [key, value] of Object.entries(settings)) {
    const rows = await query('SELECT `key` FROM settings WHERE `key` = ? LIMIT 1', [key]);
    if (!rows.length) {
      await query('INSERT INTO settings (`key`, `value`, `group`) VALUES (?, ?, ?)', [key, value, 'general']);
    }
  }
  console.log('[seed] settings ensured');
}

const main = async () => {
  console.log('[seed] starting...');
  await ensureAllTables();
  console.log('[seed] tables ensured');
  await ensureAdmin();
  // Backfill role_id for the freshly seeded admin (legacy role enum -> roles table).
  await RoleModel.migrateAdminUsers();
  await ensureCategories();
  await ensureBrands();
  await ensureProducts();
  await ensureBanners();
  await ensureCoupons();
  await ensureCms();
  await ensureShipping();
  await ensureSettings();
  console.log('[seed] done.');
  console.log('--------------------------------------------------');
  console.log('Admin panel login:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('--------------------------------------------------');
  await pool.end();
};

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
