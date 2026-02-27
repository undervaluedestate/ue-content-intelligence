'use client';

import { useEffect, useState } from 'react';
import {
  getStats,
  getContentDrafts,
  ContentDraft,
  Stats,
  triggerIngestion,
  triggerScoring,
  triggerContentGeneration,
} from '@/lib/api';
import { formatRelativeTime, getStatusColor, getPlatformColor } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingContent, setPendingContent] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const token = typeof window !== 'undefined' ? window.localStorage.getItem('adminToken') : null;
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setIsAdmin(true);
          setAdminEmail(data?.user?.email || null);
        } catch {
          window.localStorage.removeItem('adminToken');
          setIsAdmin(false);
          setAdminEmail(null);
        }
      } else {
        setIsAdmin(false);
        setAdminEmail(null);
      }

      const [statsData, contentData] = await Promise.all([
        getStats(),
        getContentDrafts({ status: 'pending', limit: 10 }),
      ]);
      setStats(statsData);
      setPendingContent(contentData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('adminToken');
    }
    setIsAdmin(false);
    setAdminEmail(null);
    loadDashboardData();
  };

  const handleAdminAction = async (action: 'ingest' | 'score' | 'generate') => {
    try {
      setAdminBusy(true);
      if (action === 'ingest') {
        await triggerIngestion();
      } else if (action === 'score') {
        await triggerScoring();
      } else {
        await triggerContentGeneration(1);
      }
      await loadDashboardData();
      alert('Done');
    } catch (err) {
      console.error(err);
      alert('Failed');
    } finally {
      setAdminBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Content Intelligence System
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Human-in-the-loop content review and approval
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/trends"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Trends
              </Link>
              <Link
                href="/content"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Review Content
              </Link>
              {isAdmin ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Logout{adminEmail ? ` (${adminEmail})` : ''}
                </button>
              ) : (
                <Link
                  href="/admin/login"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin && (
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAdminAction('ingest')}
                disabled={adminBusy}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Ingest Latest Trends
              </button>
              <button
                onClick={() => handleAdminAction('score')}
                disabled={adminBusy}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Score Trends
              </button>
              <button
                onClick={() => handleAdminAction('generate')}
                disabled={adminBusy}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Generate Content (1)
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Pending Review"
            value={stats?.content.pending || 0}
            icon="📝"
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={stats?.content.approved || 0}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Scheduled"
            value={stats?.content.scheduled || 0}
            icon="📅"
            color="blue"
          />
          <StatCard
            title="Trends Filtered"
            value={stats?.trends.passed_filter || 0}
            icon="📊"
            color="purple"
          />
        </div>

        {/* Pending Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Content Review
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {pendingContent.length} content pieces waiting for your approval
            </p>
          </div>

          {pendingContent.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No pending content to review</p>
              <p className="text-sm text-gray-400 mt-2">
                Check back later or trigger content generation
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingContent.map((content) => (
                <ContentPreviewCard key={content.id} content={content} />
              ))}
            </div>
          )}

          {pendingContent.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Link
                href="/content"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all pending content →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`text-3xl p-3 rounded-lg border ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ContentPreviewCard({ content }: { content: ContentDraft }) {
  return (
    <Link href={`/content/${content.id}`} className="block hover:bg-gray-50">
      <div className="px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium text-white ${getPlatformColor(
                  content.platform
                )}`}
              >
                {content.platform.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                {content.content_type}
              </span>
              {content.trends && (
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(content.trends.timestamp)}
                </span>
              )}
            </div>

            {content.trends && (
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {content.trends.title || content.trends.text.substring(0, 100)}
              </h3>
            )}

            <p className="text-sm text-gray-600 line-clamp-2">
              {content.content}
            </p>
          </div>

          <div className="ml-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                content.status
              )}`}
            >
              {content.status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
