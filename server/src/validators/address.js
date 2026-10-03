import { z } from 'zod';
import { idParamSchema } from './common.js';

const addressFields = {
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(15),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Invalid pincode'),
  isDefault: z.boolean().optional(),
};

export const addressBodySchema = z.object(addressFields);

export const addressParamsSchema = idParamSchema('id');
