'use client';

import { useEffect, useState } from 'react';
import { getTrends, Trend } from '@/lib/api';
import { formatRelativeTime, getRiskColor } from '@/lib/utils';
import Link from 'next/link';

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRelevance, setMinRelevance] = useState(60);

  useEffect(() => {
    loadTrends();
  }, [minRelevance]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await getTrends({ min_relevance: minRelevance, limit: 50 });
      setTrends(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Filtered Trends</h1>
              <p className="mt-1 text-sm text-gray-500">
                Trends that passed relevance and risk filters
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Min Relevance:
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minRelevance}
              onChange={(e) => setMinRelevance(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-bold text-gray-900 w-12">
              {minRelevance}
            </span>
          </div>
        </div>

        {/* Trends List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trends...</p>
          </div>
        ) : trends.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No trends found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TrendCard({ trend }: { trend: Trend }) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
              {trend.source}
            </span>
            {trend.risk_level && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(
                  trend.risk_level
                )}`}
              >
                {trend.risk_level.toUpperCase()}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatRelativeTime(trend.timestamp)}
            </span>
          </div>

          {trend.title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {trend.title}
            </h3>
          )}

          <p className="text-gray-700 mb-3">{trend.text}</p>

          {trend.keyword_matches && trend.keyword_matches.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {trend.keyword_matches.slice(0, 8).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {trend.likes > 0 && <span>❤️ {trend.likes}</span>}
            {trend.shares > 0 && <span>🔄 {trend.shares}</span>}
            {trend.author && <span>By {trend.author}</span>}
          </div>
        </div>

        {trend.relevance_score !== undefined && (
          <div className="ml-4 text-center">
            <div className="text-3xl font-bold text-primary-600">
              {trend.relevance_score.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Relevance</div>
          </div>
        )}
      </div>

      {trend.url && (
        <a
          href={trend.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          View source →
        </a>
      )}
    </div>
  );
}
