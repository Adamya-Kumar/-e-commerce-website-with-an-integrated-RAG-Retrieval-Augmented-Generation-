import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { authAttemptLimiter } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { loginBodySchema, registerBodySchema } from '../validators/auth.js';

const authRouter = Router();

authRouter.post(
  '/register',
  authAttemptLimiter,
  validate({ body: registerBodySchema }),
  register,
);
authRouter.post(
  '/login',
  authAttemptLimiter,
  validate({ body: loginBodySchema }),
  login,
);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);

export default authRouter;
