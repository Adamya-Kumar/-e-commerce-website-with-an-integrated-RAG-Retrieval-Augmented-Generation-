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

/**
 * Legal admin status changes. One step forward on the main flow.
 * Cancel is allowed only before the order ships. `cancelled` and `returned` are terminal.
 */
export const ADMIN_NEXT_STATUSES = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  return_requested: ['returned'],
  cancelled: [],
  returned: [],
};

/** Active products at or below this stock count are listed in admin stats. */
export const LOW_STOCK_THRESHOLD = 5;

/** Admin stats window for daily revenue and new customers, including today. */
export const ADMIN_STATS_DAYS = 14;

/** @param {number} subtotalPaise */
export function shippingFeeForSubtotal(subtotalPaise) {
  if (subtotalPaise > FREE_SHIPPING_ABOVE_PAISE) {
    return 0;
  }
  return SHIPPING_FEE_PAISE;
}
