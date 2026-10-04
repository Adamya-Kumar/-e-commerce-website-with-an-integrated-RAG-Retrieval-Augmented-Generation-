/** Only same-app paths. Blocks protocol-relative and external URLs. */
export function safeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}
