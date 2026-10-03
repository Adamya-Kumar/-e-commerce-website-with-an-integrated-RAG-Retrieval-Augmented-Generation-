import { Schema, model } from 'mongoose';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../config/commerce.js';
import { addressSchema } from './address.js';
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

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true, trim: true },
    image: { type: String, trim: true, default: '' },
    unitPrice: paiseField,
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

const timelineSchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const returnRequestSchema = new Schema(
  {
    reason: { type: String, required: true, trim: true },
    requestedAt: { type: Date, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'COD',
      required: true,
    },
    subtotal: paiseField,
    shippingFee: paiseField,
    total: paiseField,
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'placed',
      required: true,
    },
    timeline: { type: [timelineSchema], default: [] },
    cancelReason: { type: String, trim: true },
    returnRequest: { type: returnRequestSchema },
  },
  { timestamps: true },
);

applyJsonId(orderSchema);

export const Order = model('Order', orderSchema);
