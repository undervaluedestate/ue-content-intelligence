import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { createSupabaseClient } from './config/supabase';
import trendsRouter from './routes/trends';
import contentRouter from './routes/content';
import digestRouter from './routes/digest';
import authRouter from './routes/auth';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  const origin = req.header('origin');
  const allowedFromEnv = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isAllowed = (o: string) => {
    if (allowedFromEnv.includes(o)) return true;
    if (o === 'https://ue-content-intelligence.vercel.app') return true;
    if (o === 'http://localhost:3000') return true;
    if (o.endsWith('.vercel.app')) return true;
    return false;
  };

  if (origin && isAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else {
    // Fallback for non-browser/server-to-server calls
    res.header('Access-Control-Allow-Origin', '*');
  }

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
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('trends').select('id', { head: true, count: 'exact' });
    if (error) {
      throw error;
    }
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
app.use('/api/v1/auth', authRouter);

// Stats endpoint
app.get('/api/v1/stats', async (req: Request, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const [
      totalTrends,
      processedTrends,
      passedFilterTrends,
      pendingContent,
      approvedContent,
      rejectedContent,
      scheduledContent,
    ] = await Promise.all([
      supabase.from('trends').select('id', { count: 'exact', head: true }).then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
      supabase.from('trends').select('id', { count: 'exact', head: true }).eq('processed', true).then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
      supabase
        .from('scored_trends')
        .select('id', { count: 'exact', head: true })
        .eq('passed_filter', true)
        .then(r => {
          if (r.error) throw r.error;
          return r.count || 0;
        }),
      supabase.from('content_drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
      supabase.from('content_drafts').select('id', { count: 'exact', head: true }).eq('status', 'approved').then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
      supabase.from('content_drafts').select('id', { count: 'exact', head: true }).eq('status', 'rejected').then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
      supabase.from('content_drafts').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').then(r => {
        if (r.error) throw r.error;
        return r.count || 0;
      }),
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
    const supabase = createSupabaseClient();
    const { error } = await supabase.from('trends').select('id', { head: true, count: 'exact' });
    if (error) {
      throw error;
    }
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔑 OpenAI API Key: ${config.openaiApiKey ? '✅ Set' : '❌ Not set'}`);
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
