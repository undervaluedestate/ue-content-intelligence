import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { TrendIngestionService } from '../services/ingestion/trendIngestion';
import { RelevanceScoringService } from '../services/scoring/relevanceScorer';

const router = Router();

// POST /api/v1/trends/ingest - Ingest trends from all sources
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const ingestionService = new TrendIngestionService();
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
router.post('/score', async (req: Request, res: Response) => {
  try {
    const scoringService = new RelevanceScoringService();
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

    const trends = await prisma.trend.findMany({
      where: {
        scoredTrend: {
          passedFilter: true,
          relevanceScore: minRelevance > 0 ? { gte: minRelevance } : undefined,
          riskLevel: riskLevel || undefined,
        },
      },
      include: {
        scoredTrend: true,
      },
      orderBy: {
        scoredTrend: {
          relevanceScore: 'desc',
        },
      },
      take: limit,
    });

    res.json(trends.map(trend => ({
      id: trend.id,
      source: trend.source,
      title: trend.title,
      text: trend.text.length > 200 ? trend.text.substring(0, 200) + '...' : trend.text,
      url: trend.url,
      author: trend.author,
      timestamp: trend.timestamp,
      likes: trend.likes,
      shares: trend.shares,
      relevance_score: trend.scoredTrend?.relevanceScore,
      risk_level: trend.scoredTrend?.riskLevel,
      keyword_matches: trend.scoredTrend?.keywordMatches,
    })));
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

    const trends = await prisma.trend.findMany({
      include: {
        scoredTrend: true,
      },
      orderBy: {
        id: 'desc',
      },
      take: limit,
    });

    res.json(trends.map(trend => ({
      id: trend.id,
      source: trend.source,
      title: trend.title,
      text: trend.text.length > 200 ? trend.text.substring(0, 200) + '...' : trend.text,
      url: trend.url,
      timestamp: trend.timestamp,
      processed: trend.processed,
      relevance_score: trend.scoredTrend?.relevanceScore,
      passed_filter: trend.scoredTrend?.passedFilter,
      risk_level: trend.scoredTrend?.riskLevel,
      keyword_matches: trend.scoredTrend?.keywordMatches,
    })));
  } catch (error) {
    console.error('Error fetching all trends:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
