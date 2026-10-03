/**
 * Payable unit price in paise. `price` is the list price; `discountPercent`
 * reduces it. Callers must pass catalog values, never client-supplied prices.
 * @param {number} pricePaise
 * @param {number} [discountPercent]
 */
export function unitPricePaise(pricePaise, discountPercent = 0) {
  const discount = discountPercent || 0;
  return Math.round((pricePaise * (100 - discount)) / 100);
}
