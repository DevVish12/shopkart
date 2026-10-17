import { query } from '../config/db.js';
import { validateAndCalculate } from './coupon.js';
import { SettingsModel } from '../modules/settings/settings.model.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Server-side order totals (single source of truth, see API contract):
// subtotal -> coupon discount -> shipping (zone by pincode, free above threshold)
// -> tax on (subtotal - discount) -> grand total. All money rounded to 2 decimals.
// items: [{ productId, categoryId, price, qty }]
export const calculateTotals = async ({ items, pincode, couponCode = null, userId = null }) => {
  const subtotal = round2(items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0));

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const res = await validateAndCalculate({ code: couponCode, subtotal, userId, items });
    discount = res.discount;
    coupon = res.coupon;
  }
  const afterDiscount = round2(subtotal - discount);

  const zones = await query("SELECT * FROM shipping_zones WHERE status = 'active' ORDER BY id ASC");
  const pin = String(pincode || '').trim();
  let zone =
    zones.find((z) => (z.pincodes || '').split(',').map((s) => s.trim()).includes(pin)) || null;
  if (!zone) zone = zones.find((z) => String(z.name).toLowerCase() === 'default') || zones[0] || null;

  let shippingCharge = 0;
  if (zone) {
    shippingCharge = Number(zone.charge) || 0;
    if (zone.free_above != null && afterDiscount >= Number(zone.free_above)) shippingCharge = 0;
  }

  const taxPercent = Number(await SettingsModel.get('tax_percent', 18)) || 0;
  const taxAmount = round2(afterDiscount * (taxPercent / 100));
  const grandTotal = round2(afterDiscount + shippingCharge + taxAmount);

  return {
    subtotal,
    discount,
    shippingCharge: round2(shippingCharge),
    taxAmount,
    grandTotal,
    coupon,
    zone: zone ? { id: zone.id, name: zone.name, estimatedDays: zone.estimated_days } : null,
  };
};
