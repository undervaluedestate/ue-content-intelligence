import { Router, Request, Response } from 'express';
import { createSupabaseClient } from '../config/supabase';
import { requireAdmin } from '../middleware/requireAdmin';
import { ContentGeneratorService } from '../services/generation/contentGenerator';

const router = Router();

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// POST /api/v1/content/generate - Generate content for trends
router.post('/generate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const accessToken = (req as any).accessToken as string;
    
    const generatorService = new ContentGeneratorService(accessToken);
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
router.post('/generate/all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const accessToken = (req as any).accessToken as string;
    const generatorService = new ContentGeneratorService(accessToken);
    const supabase = createSupabaseClient(accessToken);
    
    // Get total trend count
    const { count: totalTrends, error: countError } = await supabase
      .from('trends')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }
    
    // Generate content for all trends (in batches to avoid timeout)
    const batchSize = 10;
    let totalGenerated = 0;
    const total = totalTrends || 0;
    
    for (let offset = 0; offset < total; offset += batchSize) {
      const count = await generatorService.generateContentForTopTrends(batchSize);
      totalGenerated += count;
      
      // Small delay between batches to avoid rate limits
      if (offset + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    res.json({
      status: 'success',
      total_trends: totalTrends || 0,
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
router.post('/generate/:trendId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const trendId = parseInt(req.params.trendId);
    const accessToken = (req as any).accessToken as string;
    const supabase = createSupabaseClient(accessToken);
    
    const { data: trend, error: trendError } = await supabase
      .from('trends')
      .select('id, source, source_id, title, text, url, author, timestamp, likes, shares, comments, views, scored_trends(relevance_score, keyword_matches, risk_level, passed_filter)')
      .eq('id', trendId)
      .maybeSingle();

    if (trendError) {
      throw trendError;
    }
    
    if (!trend) {
      return res.status(404).json({
        status: 'error',
        message: 'Trend not found',
      });
    }
    
    const generatorService = new ContentGeneratorService(accessToken);
    const count = await generatorService.generateContentForTrend(trend);
    
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

    const token = extractBearerToken(req);
    let supabase = createSupabaseClient();

    if (token) {
      const adminClient = createSupabaseClient(token);

      const { data: userData, error: userError } = await adminClient.auth.getUser();
      if (!userError && userData?.user) {
        const { data: adminRow, error: adminError } = await adminClient
          .from('admins')
          .select('user_id')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (!adminError && adminRow) {
          supabase = adminClient;
        }
      }
    }

    let query = supabase
      .from('content_drafts')
      .select(
        'id, trend_id, platform, content_type, content, hashtags, status, scheduled_for, published_at, created_at, trends(id, source, title, text, url, author, timestamp, scored_trends(relevance_score, risk_level, keyword_matches, passed_filter))'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: content, error } = await query;
    if (error) {
      throw error;
    }

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
router.put('/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const accessToken = (req as any).accessToken as string;
    const supabase = createSupabaseClient(accessToken);
    
    const { data: content, error } = await supabase
      .from('content_drafts')
      .update({ status: 'approved' })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }
    
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
router.put('/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const accessToken = (req as any).accessToken as string;
    const supabase = createSupabaseClient(accessToken);
    
    const { data: content, error } = await supabase
      .from('content_drafts')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }
    
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

// PUT /api/v1/content/:id/edit - Edit content draft
router.put('/:id/edit', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const accessToken = (req as any).accessToken as string;
    const supabase = createSupabaseClient(accessToken);

    const editedContent = (req.body?.edited_content as string | undefined) || '';
    if (!editedContent.trim()) {
      return res.status(400).json({ status: 'error', message: 'edited_content is required' });
    }

    const { data: content, error } = await supabase
      .from('content_drafts')
      .update({ content: editedContent })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.json({
      status: 'success',
      content,
    });
  } catch (error) {
    console.error('Error editing content:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
