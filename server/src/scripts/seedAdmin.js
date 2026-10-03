import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { BCRYPT_ROUNDS } from '../config/auth.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { toPublicUser } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.findOneAndUpdate(
    { email },
    {
      name: 'Admin',
      email,
      passwordHash,
      role: 'admin',
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return toPublicUser(user);
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  try {
    await connectDb();
    const user = await seedAdmin();
    logger.info({ email: user.email, id: user.id }, 'Admin user ready');
  } catch (err) {
    logger.error({ err }, 'Failed to seed admin');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
