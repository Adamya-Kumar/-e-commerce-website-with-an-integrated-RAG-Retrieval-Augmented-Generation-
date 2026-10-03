import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: z.string().min(8).max(72),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
