'use client';

import { useEffect, useState } from 'react';
import { getContentDrafts, approveContent, ContentDraft } from '@/lib/api';
import {
  formatRelativeTime,
  getStatusColor,
  getPlatformColor,
  copyToClipboard,
} from '@/lib/utils';
import Link from 'next/link';

export default function ContentPage() {
  const [content, setContent] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedContent, setSelectedContent] = useState<ContentDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [userEmail, setUserEmail] = useState('user@example.com');

  useEffect(() => {
    loadContent();
  }, [filter]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await getContentDrafts({
        status: filter === 'all' ? undefined : filter,
        limit: 50,
      });
      setContent(data);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contentId: number) => {
    try {
      await approveContent(contentId, 'approve', userEmail);
      await loadContent();
      setSelectedContent(null);
      alert('Content approved successfully!');
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Failed to approve content');
    }
  };

  const handleReject = async (contentId: number) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      await approveContent(contentId, 'reject', userEmail, undefined, reason || undefined);
      await loadContent();
      setSelectedContent(null);
      alert('Content rejected');
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert('Failed to reject content');
    }
  };

  const handleEdit = async (contentId: number) => {
    if (!editedText.trim()) {
      alert('Please enter edited content');
      return;
    }
    try {
      await approveContent(contentId, 'edit', userEmail, editedText);
      await loadContent();
      setEditMode(false);
      alert('Content updated successfully!');
    } catch (error) {
      console.error('Error editing content:', error);
      alert('Failed to update content');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text);
      alert('Copied to clipboard!');
    } catch (error) {
      alert('Failed to copy');
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
              <h1 className="text-3xl font-bold text-gray-900">Content Review</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and approve AI-generated content
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'scheduled', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading content...</p>
          </div>
        ) : content.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No content found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {content.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                onApprove={handleApprove}
                onReject={handleReject}
                onCopy={handleCopy}
                onSelect={() => setSelectedContent(item)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onCopy={handleCopy}
          editMode={editMode}
          setEditMode={setEditMode}
          editedText={editedText}
          setEditedText={setEditedText}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}

function ContentCard({
  content,
  onApprove,
  onReject,
  onCopy,
  onSelect,
}: {
  content: ContentDraft;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCopy: (text: string) => void;
  onSelect: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded text-xs font-bold text-white ${getPlatformColor(
                content.platform
              )}`}
            >
              {content.platform.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
              {content.angle.replace('_', ' ')}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              content.status
            )}`}
          >
            {content.status}
          </span>
        </div>
        {content.trend_info && (
          <p className="text-sm text-gray-600 font-medium">
            {content.trend_info.title || content.trend_info.text.substring(0, 80) + '...'}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap line-clamp-6">
            {content.content}
          </p>
        </div>

        {content.thread && content.thread.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            + {content.thread.length} tweet thread
          </div>
        )}

        {content.carousel_slides && content.carousel_slides.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            + {content.carousel_slides.length} carousel slides
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          View Details
        </button>
        {content.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(content.id)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onReject(content.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              ✗
            </button>
          </>
        )}
        {content.status === 'approved' && (
          <button
            onClick={() => onCopy(content.content)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            📋 Copy
          </button>
        )}
      </div>
    </div>
  );
}

function ContentDetailModal({
  content,
  onClose,
  onApprove,
  onReject,
  onCopy,
  editMode,
  setEditMode,
  editedText,
  setEditedText,
  onEdit,
}: {
  content: ContentDraft;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCopy: (text: string) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  editedText: string;
  setEditedText: (text: string) => void;
  onEdit: (id: number) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Content Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Platform & Status */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`px-3 py-1 rounded text-sm font-bold text-white ${getPlatformColor(
                content.platform
              )}`}
            >
              {content.platform.toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-700">
              {content.angle.replace('_', ' ')}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                content.status
              )}`}
            >
              {content.status}
            </span>
          </div>

          {/* Trend Info */}
          {content.trend_info && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Source Trend</h3>
              <p className="text-sm text-gray-700 mb-2">
                {content.trend_info.title || content.trend_info.text}
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Source: {content.trend_info.source}</span>
                <span>{formatRelativeTime(content.trend_info.timestamp)}</span>
                {content.trend_info.relevance_score && (
                  <span>Relevance: {content.trend_info.relevance_score.toFixed(0)}/100</span>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Generated Content</h3>
              {!editMode && content.status === 'pending' && (
                <button
                  onClick={() => {
                    setEditMode(true);
                    setEditedText(content.content);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editMode ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-700">
                {content.content}
              </div>
            )}
          </div>

          {/* Thread */}
          {content.thread && content.thread.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Thread</h3>
              <div className="space-y-2">
                {content.thread.map((tweet, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg text-sm">
                    {idx + 1}. {tweet}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carousel */}
          {content.carousel_slides && content.carousel_slides.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Carousel Slides</h3>
              <div className="grid grid-cols-2 gap-3">
                {content.carousel_slides.map((slide, idx) => (
                  <div key={idx} className="p-3 bg-pink-50 rounded-lg text-sm">
                    <span className="font-bold">Slide {idx + 1}:</span> {slide}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => onEdit(content.id)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onCopy(content.content)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                📋 Copy
              </button>
              {content.status === 'pending' && (
                <>
                  <button
                    onClick={() => onApprove(content.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => onReject(content.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                  >
                    ✗ Reject
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
