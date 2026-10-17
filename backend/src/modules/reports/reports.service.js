import { query } from '../../config/db.js';

// Revenue everywhere: SUM(grand_total) of orders NOT IN ('cancelled','refunded').
const VALID_ORDERS = `order_status NOT IN ('cancelled','refunded')`;
const VALID_ORDERS_O = `o.order_status NOT IN ('cancelled','refunded')`;

const num = (v, decimals = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return decimals === null ? n : Number(n.toFixed(decimals));
};

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

// ---------------- Dashboard ----------------

export const dashboardReport = async () => {
  const [[revenueRow], [todayRow], [ordersRow], [pendingRow], [customersRow], [productsRow], [lowStockRow]] =
    await Promise.all([
      query(`SELECT COALESCE(SUM(grand_total), 0) AS v FROM orders WHERE ${VALID_ORDERS}`),
      query(
        `SELECT COALESCE(SUM(grand_total), 0) AS v FROM orders WHERE ${VALID_ORDERS} AND DATE(created_at) = CURDATE()`
      ),
      query(`SELECT COUNT(*) AS v FROM orders WHERE ${VALID_ORDERS}`),
      query(`SELECT COUNT(*) AS v FROM orders WHERE order_status = 'pending'`),
      query(`SELECT COUNT(*) AS v FROM users WHERE status = 'active'`),
      query(`SELECT COUNT(*) AS v FROM products WHERE status = 'active'`),
      query(`SELECT COUNT(*) AS v FROM products WHERE status = 'active' AND stock <= 5`),
    ]);

  const totals = {
    revenue: num(revenueRow.v),
    todayRevenue: num(todayRow.v),
    orders: Number(ordersRow.v),
    pendingOrders: Number(pendingRow.v),
    customers: Number(customersRow.v),
    products: Number(productsRow.v),
    lowStock: Number(lowStockRow.v),
  };

  // Last 30 days (including today), fill missing dates with 0.
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(ymd(d));
  }
  const salesRows = await query(
    `SELECT DATE(created_at) AS date, COALESCE(SUM(grand_total), 0) AS revenue, COUNT(*) AS orders
     FROM orders
     WHERE ${VALID_ORDERS} AND created_at >= CURDATE() - INTERVAL 29 DAY
     GROUP BY DATE(created_at)`
  );
  const salesMap = new Map(salesRows.map((r) => [r.date, r]));
  const salesByDay = days.map((date) => {
    const r = salesMap.get(date);
    return {
      date,
      revenue: r ? num(r.revenue) : 0,
      orders: r ? Number(r.orders) : 0,
    };
  });

  const topProductRows = await query(
    `SELECT oi.product_id AS id, oi.product_name AS name, SUM(oi.qty) AS qty,
            COALESCE(SUM(oi.qty * oi.price), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE ${VALID_ORDERS_O}
     GROUP BY oi.product_id, oi.product_name
     ORDER BY qty DESC
     LIMIT 5`
  );
  const topProducts = topProductRows.map((r) => ({
    id: r.id,
    name: r.name,
    qty: Number(r.qty),
    revenue: num(r.revenue),
  }));

  const topCategoryRows = await query(
    `SELECT c.id AS id, c.name AS name, COALESCE(SUM(oi.qty * oi.price), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE ${VALID_ORDERS_O}
     GROUP BY c.id, c.name
     ORDER BY revenue DESC
     LIMIT 5`
  );
  const topCategories = topCategoryRows.map((r) => ({
    id: r.id,
    name: r.name,
    revenue: num(r.revenue),
  }));

  return { totals, charts: { salesByDay, topProducts, topCategories } };
};

// ---------------- Sales ----------------

export const salesReport = async ({ from, to, group = 'day' } = {}) => {
  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const fromDate = from || ymd(defaultFrom);
  const toDate = to || ymd(today);

  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    const err = new Error('from/to must be YYYY-MM-DD dates');
    err.statusCode = 400;
    throw err;
  }
  if (fromDate > toDate) {
    const err = new Error('from must not be after to');
    err.statusCode = 400;
    throw err;
  }
  if (!['day', 'week', 'month'].includes(group)) {
    const err = new Error('group must be day, week or month');
    err.statusCode = 400;
    throw err;
  }

  const periodExpr =
    group === 'week'
      ? 'YEARWEEK(o.created_at, 1)'
      : group === 'month'
        ? "DATE_FORMAT(o.created_at, '%Y-%m')"
        : 'DATE(o.created_at)';

  const rows = await query(
    `SELECT ${periodExpr} AS period,
            COALESCE(SUM(o.grand_total), 0) AS revenue,
            COUNT(*) AS orders
     FROM orders o
     WHERE ${VALID_ORDERS_O}
       AND DATE(o.created_at) BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period ASC`,
    [fromDate, toDate]
  );

  return rows.map((r) => ({
    period: group === 'week' ? String(r.period) : r.period,
    revenue: num(r.revenue),
    orders: Number(r.orders),
  }));
};

// ---------------- Products ----------------

export const productsReport = async (type = 'best_sellers') => {
  if (!['best_sellers', 'low_stock', 'out_of_stock'].includes(type)) {
    const err = new Error('type must be best_sellers, low_stock or out_of_stock');
    err.statusCode = 400;
    throw err;
  }

  if (type === 'best_sellers') {
    const rows = await query(
      `SELECT id, name, sku, sold_count AS qty_sold,
              COALESCE(ROUND(sold_count * price, 2), 0) AS revenue
       FROM products
       ORDER BY sold_count DESC
       LIMIT 20`
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      qty_sold: Number(r.qty_sold),
      revenue: num(r.revenue),
    }));
  }

  if (type === 'low_stock') {
    const rows = await query(
      `SELECT id, name, sku, stock
       FROM products
       WHERE status = 'active' AND stock > 0 AND stock <= 5
       ORDER BY stock ASC`
    );
    return rows.map((r) => ({ id: r.id, name: r.name, sku: r.sku, stock: Number(r.stock) }));
  }

  const rows = await query(
    `SELECT id, name, sku, stock
     FROM products
     WHERE status = 'active' AND stock = 0
     ORDER BY updated_at DESC`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, sku: r.sku, stock: Number(r.stock) }));
};

// ---------------- Customers ----------------

export const customersReport = async (type = 'new') => {
  if (!['new', 'repeat', 'top'].includes(type)) {
    const err = new Error('type must be new, repeat or top');
    err.statusCode = 400;
    throw err;
  }

  if (type === 'new') {
    const rows = await query(
      `SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 20`
    );
    return rows;
  }

  const baseSelect = (having, limit) => query(
    `SELECT u.id AS id, u.name AS name, u.email AS email,
            COUNT(o.id) AS ordersCount,
            COALESCE(SUM(o.grand_total), 0) AS totalSpent
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id AND ${VALID_ORDERS_O}
     GROUP BY u.id, u.name, u.email
     ${having}
     ORDER BY totalSpent DESC
     ${limit}`
  );

  if (type === 'repeat') {
    const rows = await baseSelect('HAVING COUNT(o.id) >= 2', '');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      ordersCount: Number(r.ordersCount),
      totalSpent: num(r.totalSpent),
    }));
  }

  const rows = await baseSelect('', 'LIMIT 20');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    ordersCount: Number(r.ordersCount),
    totalSpent: num(r.totalSpent),
  }));
};
