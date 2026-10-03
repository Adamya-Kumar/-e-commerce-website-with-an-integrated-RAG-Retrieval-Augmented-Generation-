import { Schema, model } from 'mongoose';
import { applyJsonId } from './transform.js';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{PATH} must be an integer',
      },
    },
  },
  { _id: false },
);

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: { type: [cartItemSchema], default: [] },
});

applyJsonId(cartSchema);

export const Cart = model('Cart', cartSchema);
