import { loginUser, registerUser } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
} from '../utils/authToken.js';

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  setAuthCookie(res, signAuthToken(user.id));
  res.status(201).json({ data: user });
});

export const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);
  setAuthCookie(res, signAuthToken(user.id));
  res.json({ data: user });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ data: { loggedOut: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ data: req.user });
});
