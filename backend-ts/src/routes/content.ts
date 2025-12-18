import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { ContentGeneratorService } from '../services/generation/contentGenerator';

const router = Router();

// POST /api/v1/content/generate - Generate content for top scored trends
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    const generatorService = new ContentGeneratorService();
    const generatedCount = await generatorService.generateContentForTopTrends(limit);
    
    res.json({
      status: 'success',
      generated_count: generatedCount,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/content - Get content drafts
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const content = await prisma.contentDraft.findMany({
      where: status ? { status } : undefined,
      include: {
        trend: {
          include: {
            scoredTrend: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    res.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/v1/content/:id/approve - Approve content draft
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const content = await prisma.contentDraft.update({
      where: { id },
      data: { status: 'approved' },
    });
    
    res.json({
      status: 'success',
      content,
    });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/v1/content/:id/reject - Reject content draft
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const content = await prisma.contentDraft.update({
      where: { id },
      data: { status: 'rejected' },
    });
    
    res.json({
      status: 'success',
      content,
    });
  } catch (error) {
    console.error('Error rejecting content:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
