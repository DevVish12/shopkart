import { ok, created, fail } from '../../utils/response.js';
import * as wishlistService from './wishlist.service.js';

export const getWishlist = async (req, res) => {
  try {
    const result = await wishlistService.getWishlist(req.user.id);
    return ok(res, result.data);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const result = await wishlistService.addToWishlist(req.user.id, req.body.productId);
    return created(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const result = await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
    return ok(res, null, result.message);
  } catch (e) {
    return fail(res, e.message, e.statusCode || 400);
  }
};
