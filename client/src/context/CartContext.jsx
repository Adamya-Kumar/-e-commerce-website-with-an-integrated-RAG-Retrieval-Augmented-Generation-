import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCartItemRequest,
  clearCartRequest,
  fetchCart,
  removeCartItemRequest,
  updateCartItemRequest,
} from '../api/cart.js';
import { apiErrorMessage } from '../api/http.js';
import { CartContext } from './cart-context.js';
import { useAuth } from './useAuth.js';
import { useToast } from './useToast.js';

const EMPTY_CART = { id: null, items: [], subtotal: 0, shippingFee: 0, total: 0 };

function conflictMessage(error) {
  const payload = error?.response?.data?.error;
  if (payload?.product) {
    const available = payload.product.stock ?? 0;
    const title = payload.product.title || 'This item';
    return `Only ${available} ${available === 1 ? 'unit' : 'units'} left for ${title}.`;
  }
  return apiErrorMessage(error);
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(Boolean(user));

  const refresh = useCallback(
    async (silent = false) => {
      if (!user) {
        setCart(EMPTY_CART);
        setLoading(false);
        return EMPTY_CART;
      }
      setLoading(true);
      try {
        const next = (await fetchCart()) || EMPTY_CART;
        setCart(next);
        return next;
      } catch (error) {
        if (!silent && error?.response?.status !== 401) {
          toast.error(apiErrorMessage(error));
        }
        setCart(EMPTY_CART);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast, user],
  );

  useEffect(() => {
    if (!user) {
      setCart(EMPTY_CART);
      setLoading(false);
      return;
    }
    void refresh(true);
  }, [refresh, user]);

  const addItem = useCallback(
    async (productId, qty = 1) => {
      if (!user) {
        throw new Error('UNAUTHENTICATED');
      }
      try {
        const next = await addCartItemRequest(productId, qty);
        setCart(next);
        toast.success('Added to cart.');
        return next;
      } catch (error) {
        const status = error?.response?.status;
        if (status === 409) {
          toast.error(conflictMessage(error));
        } else {
          toast.error(apiErrorMessage(error));
        }
        throw error;
      }
    },
    [toast, user],
  );

  const updateItem = useCallback(
    async (productId, qty) => {
      if (!user) {
        throw new Error('UNAUTHENTICATED');
      }
      try {
        const next = await updateCartItemRequest(productId, qty);
        setCart(next);
        return next;
      } catch (error) {
        const status = error?.response?.status;
        if (status === 409) {
          toast.error(conflictMessage(error));
        } else {
          toast.error(apiErrorMessage(error));
        }
        throw error;
      }
    },
    [toast, user],
  );

  const removeItem = useCallback(
    async (productId) => {
      if (!user) {
        throw new Error('UNAUTHENTICATED');
      }
      try {
        const next = await removeCartItemRequest(productId);
        setCart(next);
        return next;
      } catch (error) {
        toast.error(apiErrorMessage(error));
        throw error;
      }
    },
    [toast, user],
  );

  const clear = useCallback(
    async () => {
      if (!user) {
        throw new Error('UNAUTHENTICATED');
      }
      try {
        const next = await clearCartRequest();
        setCart(next);
        return next;
      } catch (error) {
        toast.error(apiErrorMessage(error));
        throw error;
      }
    },
    [toast, user],
  );

  const count = cart.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const value = useMemo(
    () => ({
      cart,
      loading,
      count,
      refresh,
      addItem,
      updateItem,
      removeItem,
      clear,
    }),
    [addItem, cart, clear, count, loading, refresh, removeItem, updateItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
