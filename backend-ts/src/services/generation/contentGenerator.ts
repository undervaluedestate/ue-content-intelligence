import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { createSupabaseClient } from '../../config/supabase';

export class ContentGeneratorService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
    if (config.googleApiKey) {
      this.genAI = new GoogleGenerativeAI(config.googleApiKey);
      this.model = this.genAI.getGenerativeModel({ model: config.aiModel });
    } else {
      console.warn('⚠️  Google API key not configured - content generation disabled');
    }
  }

  async generateContentForTopTrends(limit: number = 5): Promise<number> {
    if (!this.model) {
      console.error('❌ AI model not initialized. Check API key configuration.');
      return 0;
    }

    const supabase = createSupabaseClient(this.accessToken);

    // Get ALL trends (no filtering by passedFilter or existing content)
    // This allows generating multiple drafts per trend
    const { data: trends, error } = await supabase
      .from('trends')
      .select('id, source, source_id, title, text, url, author, timestamp, scored_trends(relevance_score, keyword_matches, risk_level, passed_filter)')
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    if (!trends || trends.length === 0) {
      console.log('ℹ️  No trends found to generate content for');
      return 0;
    }

    let totalGenerated = 0;

    for (const trend of trends) {
      try {
        const count = await this.generateContentForTrend(trend);
        totalGenerated += count;
      } catch (error) {
        console.error(`❌ Error generating content for trend ${trend.id}:`, error);
      }
    }

    console.log(`✅ Generated ${totalGenerated} content pieces`);
    return totalGenerated;
  }

  async generateContentForTrend(trend: any): Promise<number> {
    const supabase = createSupabaseClient(this.accessToken);

    const scoredTrend = trend.scoredTrend || trend.scored_trends;
    const relevanceScore = scoredTrend?.relevanceScore ?? scoredTrend?.relevance_score ?? 'N/A';
    const keywords = (scoredTrend?.keywordMatches ?? scoredTrend?.keyword_matches)?.join(', ') || 'N/A';
    
    const prompt = `You are a social media content creator for a Nigerian real estate brand called "Undervalued Estate".

Based on this trending news article, create engaging social media content:

Title: ${trend.title}
Content: ${trend.text}
URL: ${trend.url}
Relevance Score: ${relevanceScore}
Keywords: ${keywords}

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
          const { error: insertError } = await supabase.from('content_drafts').insert({
            trend_id: trend.id,
            platform,
            content_type: 'post',
            content: contentData[platform].content,
            hashtags: contentData[platform].hashtags || [],
            status: 'pending',
          });

          if (insertError) {
            throw insertError;
          }
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
