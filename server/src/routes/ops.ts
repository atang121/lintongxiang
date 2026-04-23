import { Router } from 'express';

import { getOpsService } from '../services/ops';

export const opsRouter = Router();

opsRouter.get('/bootstrap', async (_req, res) => {
  const bootstrap = await getOpsService().getBootstrap();
  res.json({ data: bootstrap });
});
