import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { ContentGeneratorService } from '../services/generation/contentGenerator';

const router = Router();

// POST /api/v1/content/generate - Generate content for trends
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

// POST /api/v1/content/generate/all - Generate content for ALL trends
router.post('/generate/all', async (req: Request, res: Response) => {
  try {
    const generatorService = new ContentGeneratorService();
    
    // Get total trend count
    const totalTrends = await prisma.trend.count();
    
    // Generate content for all trends (in batches to avoid timeout)
    const batchSize = 10;
    let totalGenerated = 0;
    
    for (let offset = 0; offset < totalTrends; offset += batchSize) {
      const count = await generatorService.generateContentForTopTrends(batchSize);
      totalGenerated += count;
      
      // Small delay between batches to avoid rate limits
      if (offset + batchSize < totalTrends) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    res.json({
      status: 'success',
      total_trends: totalTrends,
      generated_count: totalGenerated,
    });
  } catch (error) {
    console.error('Bulk content generation error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/content/generate/:trendId - Regenerate content for specific trend
router.post('/generate/:trendId', async (req: Request, res: Response) => {
  try {
    const trendId = parseInt(req.params.trendId);
    
    const trend = await prisma.trend.findUnique({
      where: { id: trendId },
      include: { scoredTrend: true },
    });
    
    if (!trend) {
      return res.status(404).json({
        status: 'error',
        message: 'Trend not found',
      });
    }
    
    const generatorService = new ContentGeneratorService();
    const count = await (generatorService as any).generateContentForTrend(trend);
    
    res.json({
      status: 'success',
      trend_id: trendId,
      generated_count: count,
    });
  } catch (error) {
    console.error('Single trend content generation error:', error);
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
