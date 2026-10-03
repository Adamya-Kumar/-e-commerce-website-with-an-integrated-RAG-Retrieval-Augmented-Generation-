/** Prices are integer paise (INR minor units). */

/** Free shipping applies when the subtotal is above 999 INR. */
export const FREE_SHIPPING_ABOVE_PAISE = 999 * 100;

export const SHIPPING_FEE_PAISE = 49 * 100;

export const RETURN_WINDOW_DAYS = 7;

export const PAYMENT_METHODS = ['COD'];

export const USER_ROLES = ['customer', 'admin'];

export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
];

/** Cancel is allowed only while the order is in one of these statuses. */
export const CANCELLABLE_STATUSES = ['placed', 'confirmed', 'packed'];

/** @param {number} subtotalPaise */
export function shippingFeeForSubtotal(subtotalPaise) {
  if (subtotalPaise > FREE_SHIPPING_ABOVE_PAISE) {
    return 0;
  }
  return SHIPPING_FEE_PAISE;
}
