import { Schema } from 'mongoose';
import { applyJsonId } from './transform.js';

export const addressSchema = new Schema({
  label: { type: String, trim: true, default: '' },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

applyJsonId(addressSchema);
