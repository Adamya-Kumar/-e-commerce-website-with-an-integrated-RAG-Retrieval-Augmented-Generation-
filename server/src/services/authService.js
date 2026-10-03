import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../config/auth.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'not-a-real-password',
  BCRYPT_ROUNDS,
);

/** @param {import('mongoose').Document} user */
export function toPublicUser(user) {
  const json = user.toJSON();
  delete json.passwordHash;
  return json;
}

/**
 * Public registration always creates a customer. Role is never taken from the body.
 * @param {{ name: string, email: string, password: string }} input
 */
export async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'customer',
    });
    return toPublicUser(user);
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw ApiError.conflict('Email is already registered');
    }
    throw err;
  }
}

/**
 * @param {{ email: string, password: string }} input
 */
export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const hash = user?.passwordHash || DUMMY_PASSWORD_HASH;
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  return toPublicUser(user);
}

/** @param {unknown} err */
function isDuplicateKey(err) {
  return Boolean(err && typeof err === 'object' && err.code === 11000);
}
