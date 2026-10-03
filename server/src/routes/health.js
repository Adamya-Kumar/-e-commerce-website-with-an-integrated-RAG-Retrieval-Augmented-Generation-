import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

export default healthRouter;
