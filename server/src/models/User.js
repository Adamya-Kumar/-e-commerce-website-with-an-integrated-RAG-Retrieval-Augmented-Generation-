import { Schema, model } from 'mongoose';
import { USER_ROLES } from '../config/commerce.js';
import { addressSchema } from './address.js';
import { applyJsonId } from './transform.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'customer',
      required: true,
    },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

applyJsonId(userSchema);

export const User = model('User', userSchema);
