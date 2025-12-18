import prisma from '../../config/database';
import { config } from '../../config';

type RiskLevel = 'safe' | 'sensitive' | 'avoid';

export class RelevanceScoringService {
  async scoreUnprocessedTrends(): Promise<number> {
    const trends = await prisma.trend.findMany({
      where: { processed: false },
      take: config.maxTrendsPerCycle,
    });

    if (trends.length === 0) {
      console.log('ℹ️  No unprocessed trends to score');
      return 0;
    }

    let scoredCount = 0;

    for (const trend of trends) {
      try {
        await this.scoreTrend(trend);
        await prisma.trend.update({
          where: { id: trend.id },
          data: { processed: true },
        });
        scoredCount++;
      } catch (error) {
        console.error(`❌ Error scoring trend ${trend.id}:`, error);
      }
    }

    console.log(`✅ Scored ${scoredCount} trends`);
    return scoredCount;
  }

  private async scoreTrend(trend: any): Promise<void> {
    const fullText = `${trend.title || ''} ${trend.text}`.toLowerCase();

    // Calculate relevance score
    const { score: relevanceScore, matches: keywordMatches } = this.calculateRelevance(fullText);

    // Calculate virality score
    const viralityScore = this.calculateVirality(trend);

    // Calculate macro impact score
    const macroImpactScore = this.calculateMacroImpact(fullText, keywordMatches);

    // Classify risk
    const { level: riskLevel, flags: sensitiveFlags, reason: riskReason } = this.classifyRisk(fullText);

    // Determine if trend passes filter
    const passedFilter = relevanceScore >= config.relevanceThreshold && riskLevel !== 'avoid';

    // Create scored trend
    await prisma.scoredTrend.create({
      data: {
        trendId: trend.id,
        relevanceScore,
        viralityScore,
        macroImpactScore,
        riskLevel,
        keywordMatches,
        sensitiveFlags,
        riskReason,
        passedFilter,
      },
    });

    console.log(
      `✅ Scored trend ${trend.id}: relevance=${relevanceScore.toFixed(1)}, risk=${riskLevel}, passed=${passedFilter}`
    );
  }

  private calculateRelevance(text: string): { score: number; matches: string[] } {
    const matchedKeywords: string[] = [];

    // Check for keyword matches
    for (const keyword of config.nigerianKeywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length === 0) {
      return { score: 0, matches: [] };
    }

    // Base score from keyword count (more generous)
    const baseScore = Math.min(matchedKeywords.length * 10, 60);

    // Bonus for high-priority real estate keywords
    const priorityKeywords = [
      'real estate',
      'housing',
      'property',
      'land',
      'mortgage',
      'rent',
      'developer',
      'construction',
      'residential',
      'commercial',
      'apartment',
    ];
    const priorityMatches = matchedKeywords.filter(kw => priorityKeywords.includes(kw));
    const priorityBonus = priorityMatches.length * 15;

    // Bonus for multiple keyword categories
    const categories = {
      'real estate': ['real estate', 'property', 'land', 'housing', 'rent', 'mortgage'],
      economic: ['inflation', 'naira', 'economy', 'investment', 'gdp', 'growth'],
      infrastructure: ['infrastructure', 'development', 'project', 'power', 'road'],
      policy: ['policy', 'government', 'regulation', 'law', 'tax'],
      location: ['lagos', 'abuja', 'lekki', 'ikoyi', 'victoria island'],
    };

    let categoriesHit = 0;
    for (const categoryKeywords of Object.values(categories)) {
      if (matchedKeywords.some(kw => categoryKeywords.includes(kw))) {
        categoriesHit++;
      }
    }

    const categoryBonus = categoriesHit * 5;

    // Calculate final score (max 100)
    const finalScore = Math.min(baseScore + priorityBonus + categoryBonus, 100);

    return { score: finalScore, matches: matchedKeywords };
  }

  private calculateVirality(trend: any): number {
    const totalEngagement = trend.likes + trend.shares + trend.comments;

    if (totalEngagement === 0) {
      return 0;
    }

    // Time-based decay (newer = higher score)
    const ageHours = (Date.now() - new Date(trend.timestamp).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0, 1 - ageHours / 24); // Decay over 24 hours

    // Engagement velocity (engagement per hour)
    const velocity = totalEngagement / Math.max(ageHours, 1);

    // Normalize to 0-100 scale (assume 100+ engagements/hour is viral)
    const viralityScore = Math.min((velocity / 100) * 100, 100) * timeFactor;

    return viralityScore;
  }

  private calculateMacroImpact(text: string, keywordMatches: string[]): number {
    // High-impact indicators
    const highImpactTerms = [
      'policy',
      'government',
      'cbn',
      'central bank',
      'regulation',
      'subsidy',
      'interest rate',
      'mortgage rate',
      'housing crisis',
      'rent control',
      'land reform',
      'tax',
      'budget',
    ];

    let impactScore = 0;

    for (const term of highImpactTerms) {
      if (text.includes(term)) {
        impactScore += 20;
      }
    }

    // Bonus if combines property + policy
    const hasProperty = keywordMatches.some(kw =>
      ['real estate', 'housing', 'rent', 'property', 'land'].includes(kw)
    );
    const hasPolicy = ['policy', 'government', 'regulation', 'law'].some(term => text.includes(term));

    if (hasProperty && hasPolicy) {
      impactScore += 30;
    }

    return Math.min(impactScore, 100);
  }

  private classifyRisk(text: string): { level: RiskLevel; flags: string[]; reason: string } {
    const sensitiveFlags: string[] = [];

    // Check for avoid keywords (immediate disqualification)
    for (const keyword of config.avoidKeywords) {
      if (text.includes(keyword)) {
        return {
          level: 'avoid',
          flags: [keyword],
          reason: `Contains prohibited keyword: ${keyword}`,
        };
      }
    }

    // Check for sensitive keywords
    for (const keyword of config.sensitiveKeywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        sensitiveFlags.push(keyword);
      }
    }

    // Classify based on sensitive flags
    if (sensitiveFlags.length >= 3) {
      return {
        level: 'avoid',
        flags: sensitiveFlags,
        reason: `Multiple sensitive keywords: ${sensitiveFlags.slice(0, 3).join(', ')}`,
      };
    } else if (sensitiveFlags.length >= 1) {
      return {
        level: 'sensitive',
        flags: sensitiveFlags,
        reason: `Contains sensitive content: ${sensitiveFlags.join(', ')}`,
      };
    } else {
      return {
        level: 'safe',
        flags: [],
        reason: 'No risk flags detected',
      };
    }
  }
}
