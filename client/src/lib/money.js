/**
 * Payable unit price in paise. Matches `unitPricePaise` on the server.
 * @param {number} pricePaise
 * @param {number} [discountPercent]
 */
export function unitPricePaise(pricePaise, discountPercent = 0) {
  const discount = discountPercent || 0;
  return Math.round((pricePaise * (100 - discount)) / 100);
}

/** @param {string} rupees */
export function rupeesToPaise(rupees) {
  if (rupees === '' || rupees == null) return null;
  const amount = Number(rupees);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** @param {number} paise */
export function formatInr(paise) {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
}
