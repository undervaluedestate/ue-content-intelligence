import { Router, Request, Response } from 'express';
import { EmailDigestService } from '../services/email/digestService';

const router = Router();

// POST /api/v1/digest/send - Send email digest with pending content
router.post('/send', async (req: Request, res: Response) => {
  try {
    const digestService = new EmailDigestService();
    const result = await digestService.sendDigest();
    
    if (result.sent) {
      res.json({
        status: 'success',
        message: `Digest sent to ${result.recipientCount} recipients`,
        content_count: result.contentCount,
      });
    } else {
      res.json({
        status: 'skipped',
        reason: result.reason,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('Digest sending error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
