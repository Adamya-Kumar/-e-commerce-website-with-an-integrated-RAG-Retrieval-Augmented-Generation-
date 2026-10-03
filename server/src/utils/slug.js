import slugify from 'slugify';

/** @param {string} value */
export function toSlug(value) {
  return slugify(value, { lower: true, strict: true, trim: true });
}
