import { Router, Request, Response } from 'express';
import { createSupabaseClient } from '../config/supabase';
import { requireAdmin } from '../middleware/requireAdmin';
import { TrendIngestionService } from '../services/ingestion/trendIngestion';
import { RelevanceScoringService } from '../services/scoring/relevanceScorer';

const router = Router();

// POST /api/v1/trends/ingest - Ingest trends from all sources
router.post('/ingest', requireAdmin, async (req: Request, res: Response) => {
  try {
    const accessToken = (req as any).accessToken as string;
    const ingestionService = new TrendIngestionService(accessToken);
    const results = await ingestionService.ingestAllSources();
    
    res.json({
      status: 'success',
      results,
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/trends/score - Score unprocessed trends
router.post('/score', requireAdmin, async (req: Request, res: Response) => {
  try {
    const accessToken = (req as any).accessToken as string;
    const scoringService = new RelevanceScoringService(accessToken);
    const scoredCount = await scoringService.scoreUnprocessedTrends();
    
    res.json({
      status: 'success',
      scored_count: scoredCount,
    });
  } catch (error) {
    console.error('Scoring error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/trends - Get filtered trends with scores
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const minRelevance = parseInt(req.query.min_relevance as string) || 0;
    const riskLevel = req.query.risk_level as string | undefined;

    const supabase = createSupabaseClient();

    let query = supabase
      .from('trends')
      .select(
        'id, source, title, text, url, author, timestamp, likes, shares, scored_trends(relevance_score, risk_level, keyword_matches, passed_filter)'
      )
      .eq('scored_trends.passed_filter', true)
      .order('relevance_score', { ascending: false, foreignTable: 'scored_trends' })
      .limit(limit);

    if (minRelevance > 0) {
      query = query.gte('scored_trends.relevance_score', minRelevance);
    }

    if (riskLevel) {
      query = query.eq('scored_trends.risk_level', riskLevel);
    }

    const { data: trends, error } = await query;
    if (error) {
      throw error;
    }

    res.json(
      (trends || []).map((trend: any) => ({
        id: trend.id,
        source: trend.source,
        title: trend.title,
        text: (trend.text || '').length > 200 ? (trend.text || '').substring(0, 200) + '...' : trend.text,
        url: trend.url,
        author: trend.author,
        timestamp: trend.timestamp,
        likes: trend.likes,
        shares: trend.shares,
        relevance_score: trend.scored_trends?.relevance_score,
        risk_level: trend.scored_trends?.risk_level,
        keyword_matches: trend.scored_trends?.keyword_matches,
      }))
    );
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/trends/all - Debug endpoint to view all trends
router.get('/all', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const supabase = createSupabaseClient();
    const { data: trends, error } = await supabase
      .from('trends')
      .select('id, source, title, text, url, timestamp, processed, scored_trends(relevance_score, passed_filter, risk_level, keyword_matches)')
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json(
      (trends || []).map((trend: any) => ({
        id: trend.id,
        source: trend.source,
        title: trend.title,
        text: (trend.text || '').length > 200 ? (trend.text || '').substring(0, 200) + '...' : trend.text,
        url: trend.url,
        timestamp: trend.timestamp,
        processed: trend.processed,
        relevance_score: trend.scored_trends?.relevance_score,
        passed_filter: trend.scored_trends?.passed_filter,
        risk_level: trend.scored_trends?.risk_level,
        keyword_matches: trend.scored_trends?.keyword_matches,
      }))
    );
  } catch (error) {
    console.error('Error fetching all trends:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
