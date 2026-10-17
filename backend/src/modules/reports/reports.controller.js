import { ok, fail } from '../../utils/response.js';
import {
  dashboardReport,
  salesReport,
  productsReport,
  customersReport,
} from './reports.service.js';

// Converts an array of flat objects to CSV: header row + quoted values.
const toCSV = (rows) => {
  const esc = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  return lines.join('\r\n');
};

const todayStamp = () => new Date().toISOString().slice(0, 10);

const sendCSV = (res, reportName, csv) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportName}-${todayStamp()}.csv"`);
  return res.status(200).send(csv);
};

const isCSV = (req) => req.query.format === 'csv';

// Dashboard as CSV: one logical table per section, separated by blank lines.
const dashboardToCSV = (data) => {
  const t = data.totals;
  const totalsRows = [
    { metric: 'revenue', value: t.revenue },
    { metric: 'today_revenue', value: t.todayRevenue },
    { metric: 'orders', value: t.orders },
    { metric: 'pending_orders', value: t.pendingOrders },
    { metric: 'customers', value: t.customers },
    { metric: 'products', value: t.products },
    { metric: 'low_stock', value: t.lowStock },
  ];
  const sections = [toCSV(totalsRows)];
  if (data.charts.salesByDay.length) sections.push(toCSV(data.charts.salesByDay));
  if (data.charts.topProducts.length) sections.push(toCSV(data.charts.topProducts));
  if (data.charts.topCategories.length) sections.push(toCSV(data.charts.topCategories));
  return sections.join('\r\n\r\n');
};

export const getDashboard = async (req, res) => {
  try {
    const data = await dashboardReport();
    if (isCSV(req)) return sendCSV(res, 'dashboard', dashboardToCSV(data));
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const getSales = async (req, res) => {
  try {
    const data = await salesReport({
      from: req.query.from,
      to: req.query.to,
      group: req.query.group || 'day',
    });
    if (isCSV(req)) return sendCSV(res, 'sales', toCSV(data));
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const getProductsReport = async (req, res) => {
  try {
    const type = req.query.type || 'best_sellers';
    const data = await productsReport(type);
    if (isCSV(req)) return sendCSV(res, 'products', toCSV(data));
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const getCustomersReport = async (req, res) => {
  try {
    const type = req.query.type || 'new';
    const data = await customersReport(type);
    if (isCSV(req)) return sendCSV(res, 'customers', toCSV(data));
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
