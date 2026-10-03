import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

/** Role-check probe until the admin API lands in P1-07. */
adminRouter.get('/ping', (_req, res) => {
  res.json({ data: { ok: true } });
});

export default adminRouter;
