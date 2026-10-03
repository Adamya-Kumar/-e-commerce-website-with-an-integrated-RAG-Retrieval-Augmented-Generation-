export const AUTH_COOKIE_NAME = 'token';

export const JWT_EXPIRES_IN = '7d';

export const JWT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Spec requires bcrypt cost 10 or higher. */
export const BCRYPT_ROUNDS = 10;

/** Login and register share this cap per IP per window. */
export const AUTH_ATTEMPT_LIMIT = 10;

export const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
