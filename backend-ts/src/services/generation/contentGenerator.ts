import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../../config/database';
import { config } from '../../config';

export class ContentGeneratorService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    if (config.googleApiKey) {
      this.genAI = new GoogleGenerativeAI(config.googleApiKey);
      // Use gemini-2.0-flash (fast, latest stable model)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } else {
      console.warn('⚠️  Google API key not configured - content generation disabled');
    }
  }

  async generateContentForTopTrends(limit: number = 5): Promise<number> {
    if (!this.model) {
      console.error('❌ AI model not initialized. Check API key configuration.');
      return 0;
    }

    // Get top trends without content drafts
    const scoredTrends = await prisma.scoredTrend.findMany({
      where: {
        passedFilter: true,
        trend: {
          content: {
            none: {},
          },
        },
      },
      include: {
        trend: true,
      },
      orderBy: {
        relevanceScore: 'desc',
      },
      take: limit,
    });

    if (scoredTrends.length === 0) {
      console.log('ℹ️  No new trends to generate content for');
      return 0;
    }

    let totalGenerated = 0;

    for (const scoredTrend of scoredTrends) {
      try {
        const count = await this.generateContentForTrend(scoredTrend);
        totalGenerated += count;
      } catch (error) {
        console.error(`❌ Error generating content for trend ${scoredTrend.id}:`, error);
      }
    }

    console.log(`✅ Generated ${totalGenerated} content pieces`);
    return totalGenerated;
  }

  private async generateContentForTrend(scoredTrend: any): Promise<number> {
    const trend = scoredTrend.trend;
    
    const prompt = `You are a social media content creator for a Nigerian real estate brand called "Undervalued Estate".

Based on this trending news article, create engaging social media content:

Title: ${trend.title}
Content: ${trend.text}
URL: ${trend.url}
Relevance Score: ${scoredTrend.relevanceScore}
Keywords: ${scoredTrend.keywordMatches.join(', ')}

Create 3 social media posts:
1. A Twitter/X post (280 characters max)
2. A LinkedIn post (professional, 500 characters)
3. An Instagram caption (engaging, with emojis, 300 characters)

For each post:
- Make it relevant to Nigerian real estate investors and homebuyers
- Include a call-to-action
- Suggest 3-5 relevant hashtags
- Keep the tone professional but engaging
- Reference the news without copying it verbatim

Format your response as JSON:
{
  "twitter": {
    "content": "...",
    "hashtags": ["...", "..."]
  },
  "linkedin": {
    "content": "...",
    "hashtags": ["...", "..."]
  },
  "instagram": {
    "content": "...",
    "hashtags": ["...", "..."]
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }

      const contentData = JSON.parse(jsonMatch[0]);

      // Create content drafts
      const platforms = ['twitter', 'linkedin', 'instagram'];
      let createdCount = 0;

      for (const platform of platforms) {
        if (contentData[platform]) {
          await prisma.contentDraft.create({
            data: {
              trendId: trend.id,
              platform,
              contentType: 'post',
              content: contentData[platform].content,
              hashtags: contentData[platform].hashtags || [],
              status: 'pending',
            },
          });
          createdCount++;
        }
      }

      console.log(`✅ Generated ${createdCount} content pieces for trend ${trend.id}`);
      return createdCount;
    } catch (error) {
      console.error(`❌ Error generating content:`, error);
      return 0;
    }
  }
}
