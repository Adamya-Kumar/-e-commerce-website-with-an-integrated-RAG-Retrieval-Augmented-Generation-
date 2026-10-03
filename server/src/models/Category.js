import { Schema, model } from 'mongoose';
import { toSlug } from '../utils/slug.js';
import { applyJsonId } from './transform.js';

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  image: { type: String, trim: true },
  isActive: { type: Boolean, default: true, required: true },
});

categorySchema.pre('validate', function setSlug() {
  const source = this.slug || this.name;
  if (source) {
    this.slug = toSlug(source);
  }
});

applyJsonId(categorySchema);

export const Category = model('Category', categorySchema);
