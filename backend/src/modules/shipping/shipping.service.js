// Shipping zones business logic. Throws Error with err.statusCode on failure.
import { ShippingModel } from './shipping.model.js';

const failWith = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const publicZone = (z) => ({
  id: z.id,
  name: z.name,
  charge: Number(z.charge || 0),
  free_above: z.free_above,
  estimated_days: z.estimated_days,
});

export const listActiveZones = async () => {
  const zones = await ShippingModel.listActive();
  return zones.map(publicZone);
};

export const checkPincode = async (pincode) => {
  const pin = String(pincode || '').trim();
  const zones = await ShippingModel.listActive();
  const zone = zones.find((z) =>
    String(z.pincodes || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(pin)
  );
  if (!zone) {
    return { serviceable: false, message: 'Delivery not available for this pincode' };
  }
  return {
    serviceable: true,
    zone: { id: zone.id, name: zone.name },
    charge: Number(zone.charge || 0),
    freeAbove: zone.free_above == null ? null : Number(zone.free_above),
    estimatedDays: zone.estimated_days,
  };
};

export const listAllZones = async () => {
  const zones = await ShippingModel.listAll();
  return zones;
};

export const createZone = async (data) => {
  const id = await ShippingModel.create({
    name: data.name,
    pincodes: data.pincodes,
    charge: data.charge ?? 0,
    free_above: data.free_above ?? null,
    estimated_days: data.estimated_days ?? null,
    status: data.status || 'active',
  });
  return { zone: await ShippingModel.findById(id) };
};

export const updateZone = async (id, data) => {
  const zone = await ShippingModel.findById(id);
  if (!zone) throw failWith(404, 'Shipping zone not found');
  const patch = {};
  for (const key of ['name', 'pincodes', 'charge', 'free_above', 'estimated_days', 'status']) {
    if (data[key] !== undefined) patch[key] = data[key];
  }
  if (Object.keys(patch).length) {
    await ShippingModel.update(id, patch);
  }
  return { zone: await ShippingModel.findById(id) };
};

export const deleteZone = async (id) => {
  const zone = await ShippingModel.findById(id);
  if (!zone) throw failWith(404, 'Shipping zone not found');
  await ShippingModel.remove(id);
  return { message: 'Shipping zone deleted' };
};

export const setZoneStatus = async (id, status) => {
  const zone = await ShippingModel.findById(id);
  if (!zone) throw failWith(404, 'Shipping zone not found');
  await ShippingModel.setStatus(id, status);
  return { message: `Shipping zone ${status === 'active' ? 'activated' : 'deactivated'}` };
};
