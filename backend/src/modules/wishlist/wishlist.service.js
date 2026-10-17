import { WishlistModel } from './wishlist.model.js';
import { toListItem } from '../../utils/productFormat.js';

export const getWishlist = async (userId) => {
  const rows = await WishlistModel.listForUser(userId);
  return { data: rows.map(toListItem) };
};

export const addToWishlist = async (userId, productId) => {
  const product = await WishlistModel.findProduct(productId);
  if (!product || product.status !== 'active') {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  const exists = await WishlistModel.exists(userId, productId);
  if (exists) {
    const err = new Error('Already in wishlist');
    err.statusCode = 409;
    throw err;
  }
  await WishlistModel.add(userId, productId);
  return { message: 'Added to wishlist' };
};

export const removeFromWishlist = async (userId, productId) => {
  await WishlistModel.remove(userId, productId);
  return { message: 'Removed from wishlist' };
};
