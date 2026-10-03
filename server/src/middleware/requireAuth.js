import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/auth.js';
import { User } from '../models/User.js';
import { toPublicUser } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readAuthToken } from '../utils/authToken.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readAuthToken(req);
  if (!token) {
    throw ApiError.unauthorized();
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const userId = payload && typeof payload === 'object' ? payload.sub : null;
  if (typeof userId !== 'string') {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized();
  }

  req.user = toPublicUser(user);
  next();
});

/** @param {...string} roles */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
