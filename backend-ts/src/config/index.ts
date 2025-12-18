import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // AI Services
  googleApiKey: process.env.GOOGLE_API_KEY,
  
  // Email
  gmail: {
    user: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD,
  },
  
  // Content Settings
  relevanceThreshold: parseInt(process.env.RELEVANCE_THRESHOLD || '40', 10),
  maxTrendsPerCycle: parseInt(process.env.MAX_TRENDS_PER_CYCLE || '20', 10),
  
  // Feature Flags
  enableGoogleNews: process.env.ENABLE_GOOGLE_NEWS === 'true',
  enableEmailDigest: process.env.ENABLE_EMAIL_DIGEST === 'true',
  
  // Keywords
  nigerianKeywords: (process.env.NIGERIAN_KEYWORDS || '').split(',').map(k => k.trim()).filter(Boolean),
  sensitiveKeywords: (process.env.SENSITIVE_KEYWORDS || '').split(',').map(k => k.trim()).filter(Boolean),
  avoidKeywords: (process.env.AVOID_KEYWORDS || '').split(',').map(k => k.trim()).filter(Boolean),
};

// Validate required config
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!config.googleApiKey) {
  console.warn('⚠️  GOOGLE_API_KEY not set - content generation will be disabled');
}

if (!config.gmail.user || !config.gmail.appPassword) {
  console.warn('⚠️  Gmail credentials not set - email digest will be disabled');
}
