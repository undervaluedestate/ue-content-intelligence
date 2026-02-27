'use client';

import { useEffect, useState } from 'react';
import { generateContentForTrend, getTrends, Trend } from '@/lib/api';
import { formatRelativeTime, getRiskColor, truncateText } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/api';

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRelevance, setMinRelevance] = useState(60);
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    loadTrends();
  }, [minRelevance, riskLevel]);

  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('adminToken') : null;
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        await api.get('/auth/me');
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await getTrends({
        min_relevance: minRelevance,
        limit: 50,
        risk_level: riskLevel === 'all' ? undefined : riskLevel,
      });
      setTrends(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrends = trends.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.text || '').toLowerCase().includes(q) ||
      (t.keyword_matches || []).some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleGenerateForSelected = async (includeBlog: boolean) => {
    if (!selectedTrend) return;
    try {
      setAdminBusy(true);
      await generateContentForTrend(selectedTrend.id, { include_blog: includeBlog });
      alert('Content generated');
    } catch (e) {
      console.error(e);
      alert('Failed to generate content');
    } finally {
      setAdminBusy(false);
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Search title, text, keywords..."
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Risk</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All</option>
                  <option value="safe">Safe</option>
                  <option value="sensitive">Sensitive</option>
                  <option value="avoid">Avoid</option>
                </select>
              </div>

              <button
                onClick={loadTrends}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Min Relevance:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={minRelevance}
                onChange={(e) => setMinRelevance(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-gray-900 w-12">{minRelevance}</span>
            </div>
          </div>
        </div>

        {/* Trends List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trends...</p>
          </div>
        ) : filteredTrends.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No trends found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTrends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} onSelect={() => setSelectedTrend(trend)} />
            ))}
          </div>
        )}
      </main>

      {selectedTrend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Trend Details</h2>
                <p className="text-xs text-gray-500">{formatRelativeTime(selectedTrend.timestamp)}</p>
              </div>
              <button
                onClick={() => setSelectedTrend(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {selectedTrend.source}
                </span>
                {selectedTrend.risk_level && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(selectedTrend.risk_level)}`}>
                    {selectedTrend.risk_level.toUpperCase()}
                  </span>
                )}
                {selectedTrend.relevance_score !== undefined && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-primary-50 text-primary-700">
                    Relevance {selectedTrend.relevance_score.toFixed(0)}
                  </span>
                )}
              </div>

              {selectedTrend.title && (
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{selectedTrend.title}</h3>
              )}

              <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedTrend.text}</p>

              {selectedTrend.keyword_matches && selectedTrend.keyword_matches.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedTrend.keyword_matches.slice(0, 16).map((keyword, idx) => (
                    <span key={idx} className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {selectedTrend.url && (
                  <a
                    href={selectedTrend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open Source
                  </a>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleGenerateForSelected(false)}
                      disabled={adminBusy}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      Generate Social Drafts
                    </button>
                    <button
                      onClick={() => handleGenerateForSelected(true)}
                      disabled={adminBusy}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                      Generate + Blog
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendCard({ trend, onSelect }: { trend: Trend; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left bg-white rounded-lg shadow border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition"
    >
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

          <p className="text-gray-700 mb-3">{truncateText(trend.text, 260)}</p>

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
        <span className="text-sm text-primary-600">View source →</span>
      )}
    </button>
  );
}
