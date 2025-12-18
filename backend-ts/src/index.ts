import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import prisma from './config/database';
import trendsRouter from './routes/trends';
import contentRouter from './routes/content';
import digestRouter from './routes/digest';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: config.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/v1/trends', trendsRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/digest', digestRouter);

// Stats endpoint
app.get('/api/v1/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalTrends,
      processedTrends,
      passedFilterTrends,
      pendingContent,
      approvedContent,
      rejectedContent,
      scheduledContent,
    ] = await Promise.all([
      prisma.trend.count(),
      prisma.trend.count({ where: { processed: true } }),
      prisma.scoredTrend.count({ where: { passedFilter: true } }),
      prisma.contentDraft.count({ where: { status: 'pending' } }),
      prisma.contentDraft.count({ where: { status: 'approved' } }),
      prisma.contentDraft.count({ where: { status: 'rejected' } }),
      prisma.contentDraft.count({ where: { status: 'scheduled' } }),
    ]);

    res.json({
      trends: {
        total: totalTrends,
        processed: processedTrends,
        passed_filter: passedFilterTrends,
      },
      content: {
        pending: pendingContent,
        approved: approvedContent,
        rejected: rejectedContent,
        scheduled: scheduledContent,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔑 Google API Key: ${config.googleApiKey ? '✅ Set' : '❌ Not set'}`);
      console.log(`📧 Gmail: ${config.gmail.user ? '✅ Configured' : '❌ Not configured'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
