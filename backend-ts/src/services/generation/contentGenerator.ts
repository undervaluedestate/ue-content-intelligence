import axios from 'axios';
import { config } from '../../config';
import { createSupabaseClient } from '../../config/supabase';

export class ContentGeneratorService {
  private openaiApiKey: string | null = null;
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
    if (config.openaiApiKey) {
      this.openaiApiKey = config.openaiApiKey;
    } else {
      console.warn('⚠️  OpenAI API key not configured - content generation disabled');
    }
  }

  async generateContentForTopTrends(limit: number = 5, includeBlog: boolean = false): Promise<number> {
    if (!this.openaiApiKey) {
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
        const count = await this.generateContentForTrend(trend, includeBlog);
        totalGenerated += count;
      } catch (error) {
        console.error(`❌ Error generating content for trend ${trend.id}:`, error);
      }
    }

    console.log(`✅ Generated ${totalGenerated} content pieces`);
    return totalGenerated;
  }

  async generateContentForTrend(trend: any, includeBlog: boolean = false): Promise<number> {
    const supabase = createSupabaseClient(this.accessToken);

    const scoredTrend = trend.scoredTrend || trend.scored_trends;
    const relevanceScore = scoredTrend?.relevanceScore ?? scoredTrend?.relevance_score ?? 'N/A';
    const keywords = (scoredTrend?.keywordMatches ?? scoredTrend?.keyword_matches)?.join(', ') || 'N/A';
    
    const prompt = `You are a content marketer for a Nigerian real estate brand called "Undervalued Estate".

Based on this trending news article, create engaging social media content:

Title: ${trend.title}
Content: ${trend.text}
URL: ${trend.url}
Relevance Score: ${relevanceScore}
Keywords: ${keywords}

Create the following content assets:
1. A Twitter/X post (strictly 280 characters max)
2. A Twitter/X Premium post (up to 2000 characters)
3. A LinkedIn post (professional, up to 3000 characters)
4. An Instagram caption (engaging, up to 2200 characters)
${includeBlog ? '5. An SEO-optimized pillar blog article (2,500–4,000 words) in Markdown' : ''}

For each post:
- Make it relevant to Nigerian real estate investors and homebuyers
- Include a call-to-action
- Suggest 3-5 relevant hashtags
- Keep the tone professional but engaging
- Reference the news without copying it verbatim

Additional requirements:
- Twitter/X (280): punchy, crisp, avoid fluff.
- Twitter/X Premium (up to 2000): add context, 3 bullet takeaways, and a stronger CTA.
- LinkedIn (up to 3000): structure with a strong hook, 3-6 short paragraphs, and bullet insights.
- Instagram (up to 2200): include a short hook, line breaks, and emojis (not too many).
${includeBlog ? '- Blog: include H1 title, table of contents, H2/H3 headings, internal linking suggestions (as plain text), and a short FAQ section (3-6 Q&As). Also include a meta description (<= 160 chars) and suggested SEO keywords (5-12).
' : ''}

Format your response as JSON:
{
  "twitter": {
    "content": "...",
    "hashtags": ["...", "..."]
  },
  "twitter_premium": {
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
  }${includeBlog ? ',\n  "blog": {\n    "title": "...",\n    "meta_description": "...",\n    "keywords": ["..."],\n    "content_markdown": "..."\n  }' : ''}
}`;

    try {
      const { data } = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: config.openaiModel,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that returns strictly valid JSON with no surrounding commentary.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const text = data?.choices?.[0]?.message?.content;
      if (!text || typeof text !== 'string') {
        throw new Error('OpenAI returned empty response');
      }

      // Parse JSON response
      const contentData = JSON.parse(text);

      // Create content drafts
      const platforms = ['twitter', 'twitter_premium', 'linkedin', 'instagram'];
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

      if (includeBlog && contentData.blog?.content_markdown) {
        const blogTitle = typeof contentData.blog.title === 'string' ? contentData.blog.title : '';
        const blogMeta = typeof contentData.blog.meta_description === 'string' ? contentData.blog.meta_description : '';
        const blogKeywords = Array.isArray(contentData.blog.keywords) ? contentData.blog.keywords : [];

        const fullBlogMarkdown = `# ${blogTitle}\n\n${blogMeta ? `*Meta description:* ${blogMeta}\n\n` : ''}${contentData.blog.content_markdown}`;

        const { error: insertBlogError } = await supabase.from('content_drafts').insert({
          trend_id: trend.id,
          platform: 'blog',
          content_type: 'article',
          content: fullBlogMarkdown,
          hashtags: blogKeywords,
          status: 'pending',
        });

        if (insertBlogError) {
          throw insertBlogError;
        }

        createdCount++;
      }

      console.log(`✅ Generated ${createdCount} content pieces for trend ${trend.id}`);
      return createdCount;
    } catch (error) {
      console.error(`❌ Error generating content:`, error);
      return 0;
    }
  }
}
