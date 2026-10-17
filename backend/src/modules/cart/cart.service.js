import { CartModel } from './cart.model.js';
import { toListItem, effectivePrice } from '../../utils/productFormat.js';

const round2 = (n) => Number(Number(n).toFixed(2));

const notFound = (message, statusCode = 404) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toVariantPublic = (row) =>
  row.v_id == null
    ? null
    : {
        id: Number(row.v_id),
        size: row.v_size,
        color: row.v_color,
        weight_label: row.v_weight_label,
        sku: row.v_sku,
        price: row.v_price == null ? null : Number(row.v_price),
        mrp: row.v_mrp == null ? null : Number(row.v_mrp),
        stock: Number(row.v_stock),
      };

export const getCart = async (userId) => {
  const rows = await CartModel.getDisplayItems(userId);
  const items = rows.map((row) => {
    const qty = Number(row.qty);
    const price = round2(row.line_price);
    return {
      id: Number(row.item_id),
      product: toListItem(row),
      variant: toVariantPublic(row),
      qty,
      price,
      lineTotal: round2(price * qty),
    };
  });
  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  return { cart: { items, subtotal, itemCount } };
};

const resolveProductAndVariant = async (productId, variantId) => {
  const product = await CartModel.findProduct(productId);
  if (!product) throw notFound('Product not found');
  if (product.status !== 'active') {
    const err = new Error('Product is not available');
    err.statusCode = 400;
    throw err;
  }
  let variant = null;
  if (variantId != null) {
    variant = await CartModel.findVariant(variantId);
    if (!variant || Number(variant.product_id) !== Number(productId)) {
      const err = new Error('Invalid variant for this product');
      err.statusCode = 400;
      throw err;
    }
  }
  return { product, variant };
};

const assertStock = (product, variant, qty) => {
  const available = variant ? Number(variant.stock) : Number(product.stock);
  if (available <= 0) {
    const err = new Error('Product is out of stock');
    err.statusCode = 400;
    throw err;
  }
  if (qty > available) {
    const err = new Error('Insufficient stock');
    err.statusCode = 400;
    throw err;
  }
};

export const addItem = async (userId, { productId, variantId, qty }) => {
  const { product, variant } = await resolveProductAndVariant(productId, variantId);
  const addQty = Math.max(1, Number(qty) || 1);
  assertStock(product, variant, addQty);

  const cart = await CartModel.getOrCreateCart(userId);
  const existing = await CartModel.findLine(cart.id, productId, variantId || null);
  const newQty = (existing ? Number(existing.qty) : 0) + addQty;
  assertStock(product, variant, newQty);

  const price = round2(effectivePrice(product, variant));
  if (existing) {
    await CartModel.updateItemQty(existing.id, newQty);
  } else {
    await CartModel.createItem({
      cartId: cart.id,
      productId,
      variantId: variantId || null,
      qty: addQty,
      price,
    });
  }
  return getCart(userId);
};

export const updateItem = async (userId, itemId, qty) => {
  const item = await CartModel.findItemById(itemId);
  if (!item || Number(item.user_id) !== Number(userId)) throw notFound('Cart item not found');
  const newQty = Number(qty);
  if (!Number.isInteger(newQty) || newQty < 0) {
    const err = new Error('Quantity must be a non-negative integer');
    err.statusCode = 400;
    throw err;
  }
  if (newQty === 0) {
    await CartModel.deleteItem(itemId);
    return getCart(userId);
  }
  const { product, variant } = await resolveProductAndVariant(
    item.product_id,
    item.variant_id
  );
  assertStock(product, variant, newQty);
  await CartModel.updateItemQty(itemId, newQty);
  return getCart(userId);
};

export const removeItem = async (userId, itemId) => {
  const item = await CartModel.findItemById(itemId);
  if (!item || Number(item.user_id) !== Number(userId)) throw notFound('Cart item not found');
  await CartModel.deleteItem(itemId);
  return getCart(userId);
};

export const clearCart = async (userId) => {
  await CartModel.clearCart(userId);
  return { message: 'Cart cleared' };
};
