import jwt from 'jsonwebtoken';
import {
  AUTH_COOKIE_NAME,
  JWT_EXPIRES_IN,
  JWT_MAX_AGE_MS,
  authCookieOptions,
  getJwtSecret,
} from '../config/auth.js';

/** @param {string} userId */
export function signAuthToken(userId) {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Cookie first, then `Authorization: Bearer` so the chatbot can forward the user token.
 * @param {import('express').Request} req
 */
export function readAuthToken(req) {
  const cookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookie === 'string' && cookie) {
    return cookie;
  }

  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token) {
      return token;
    }
  }

  return null;
}

/** @param {import('express').Response} res @param {string} token */
export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...authCookieOptions(),
    maxAge: JWT_MAX_AGE_MS,
  });
}

/** @param {import('express').Response} res */
export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
}
