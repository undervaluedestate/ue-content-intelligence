import axios from 'axios';
import FeedParser from 'feedparser';
import { Readable } from 'stream';
import prisma from '../../config/database';
import { config } from '../../config';

interface IngestionResults {
  google_news: number;
}

export class TrendIngestionService {
  async ingestAllSources(): Promise<IngestionResults> {
    const results: IngestionResults = {
      google_news: 0,
    };

    if (config.enableGoogleNews) {
      results.google_news = await this.ingestGoogleNews();
    }

    console.log('✅ Ingestion complete:', results);
    return results;
  }

  async ingestGoogleNews(): Promise<number> {
    const rssFeeds = [
      // Real Estate Specific (targeted)
      'https://news.google.com/rss/search?q=Nigeria+real+estate+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      'https://news.google.com/rss/search?q=Nigeria+property+housing+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      'https://news.google.com/rss/search?q=Lagos+real+estate+development+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      // Economic Impact (relevant to real estate)
      'https://news.google.com/rss/search?q=Nigeria+inflation+interest+rate+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      'https://news.google.com/rss/search?q=Nigeria+infrastructure+development+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      // General Business & Economy (broad net)
      'https://news.google.com/rss/search?q=Nigeria+business+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      'https://news.google.com/rss/search?q=Nigeria+economy+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
      // Top Nigeria news (catch-all)
      'https://news.google.com/rss/search?q=Nigeria+when:12h&hl=en-NG&gl=NG&ceid=NG:en',
    ];

    let newCount = 0;
    const cutoffTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

    console.log(`📰 Starting Google News ingestion from ${rssFeeds.length} feeds`);

    for (const feedUrl of rssFeeds) {
      try {
        const response = await axios.get(feedUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ContentIntelligenceBot/1.0)',
          },
        });

        const entries = await this.parseFeed(response.data);
        console.log(`📄 Processing ${entries.length} entries from feed`);

        for (const entry of entries.slice(0, 10)) {
          try {
            // Parse published date
            let published: Date;
            try {
              published = entry.pubdate ? new Date(entry.pubdate) : new Date();
              // If date is in the future, use current time
              if (published > new Date()) {
                published = new Date();
              }
            } catch {
              published = new Date();
            }

            // Skip articles older than 12 hours
            if (published < cutoffTime) {
              continue;
            }

            // Create source ID
            const sourceId = `google_news_${entry.guid || entry.link}`;

            // Check if already exists
            const existing = await prisma.trend.findUnique({
              where: { sourceId },
            });

            if (existing) {
              continue;
            }

            // Create new trend
            await prisma.trend.create({
              data: {
                source: 'google_news',
                sourceId,
                title: entry.title || '',
                text: entry.description || entry.summary || entry.title || '',
                url: entry.link || '',
                author: entry.author || entry['dc:creator'] || 'Unknown',
                timestamp: published,
              },
            });

            newCount++;
          } catch (entryError) {
            console.error('❌ Error processing entry:', entryError);
          }
        }

        console.log(`✅ Committed ${newCount} trends so far`);
      } catch (feedError) {
        console.error('❌ Error parsing feed:', feedError);
      }
    }

    console.log(`✅ Ingested ${newCount} news items from Google News`);
    return newCount;
  }

  private parseFeed(xmlData: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const feedparser = new (FeedParser as any)({});
      const entries: any[] = [];

      feedparser.on('readable', function (this: any) {
        let item;
        while ((item = this.read())) {
          entries.push(item);
        }
      });

      feedparser.on('end', () => {
        resolve(entries);
      });

      feedparser.on('error', (error: Error) => {
        reject(error);
      });

      const stream = Readable.from([xmlData]);
      stream.pipe(feedparser);
    });
  }
}
