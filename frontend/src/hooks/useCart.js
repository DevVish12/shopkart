import { useCart } from '../context/CartContext.jsx';

export default function useCartHook() {
  return useCart();
}

export { useCart } from '../context/CartContext.jsx';
