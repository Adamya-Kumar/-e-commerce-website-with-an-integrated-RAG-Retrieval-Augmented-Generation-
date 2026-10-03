import { Schema, model } from 'mongoose';
import { toSlug } from '../utils/slug.js';
import { applyJsonId } from './transform.js';

const paiseField = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: '{PATH} must be an integer number of paise',
  },
};

const productImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true, trim: true },
    price: paiseField,
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: '{PATH} must be an integer',
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{PATH} must be an integer',
      },
    },
    images: { type: [productImageSchema], default: [] },
    tags: { type: [String], default: [] },
    attributes: { type: Map, of: String, default: {} },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

productSchema.index(
  { title: 'text', description: 'text', tags: 'text', brand: 'text' },
  { name: 'ProductTextIndex' },
);

productSchema.pre('validate', function setSlug() {
  const source = this.slug || this.title;
  if (source) {
    this.slug = toSlug(source);
  }
});

applyJsonId(productSchema);

export const Product = model('Product', productSchema);
