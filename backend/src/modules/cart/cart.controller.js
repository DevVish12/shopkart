import { ok, fail } from '../../utils/response.js';
import * as cartService from './cart.service.js';

export const getCart = async (req, res) => {
  try {
    const result = await cartService.getCart(req.user.id);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const addItem = async (req, res) => {
  try {
    const result = await cartService.addItem(req.user.id, req.body);
    return ok(res, result, 'Item added to cart');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const updateItem = async (req, res) => {
  try {
    const result = await cartService.updateItem(req.user.id, req.params.itemId, req.body.qty);
    return ok(res, result, 'Cart updated');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const removeItem = async (req, res) => {
  try {
    const result = await cartService.removeItem(req.user.id, req.params.itemId);
    return ok(res, result, 'Item removed from cart');
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const clearCart = async (req, res) => {
  try {
    const result = await cartService.clearCart(req.user.id);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
