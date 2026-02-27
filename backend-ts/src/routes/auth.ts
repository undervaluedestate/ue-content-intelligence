import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/v1/auth/me - Verify token + admin status
router.get('/me', requireAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;

  res.json({
    status: 'success',
    user: {
      id: user?.id,
      email: user?.email,
    },
  });
});

export default router;
