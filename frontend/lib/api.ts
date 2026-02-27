/**
 * API client for communicating with the backend.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('adminToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Types
export interface Trend {
  id: number;
  source: string;
  title?: string;
  text: string;
  url?: string;
  author?: string;
  timestamp: string;
  likes: number;
  shares: number;
  relevance_score?: number;
  risk_level?: string;
  keyword_matches?: string[];
}

export interface ContentDraft {
  id: number;
  trend_id: number;
  platform: string;
  content_type: string;
  content: string;
  hashtags: string[];
  status: string;
  scheduled_for?: string;
  published_at?: string;
  created_at: string;
  trends?: Trend;
}

export interface Stats {
  trends: {
    total: number;
    processed: number;
    passed_filter: number;
  };
  content: {
    pending: number;
    approved: number;
    rejected: number;
    scheduled: number;
  };
}

// API Functions

export const getTrends = async (params?: {
  limit?: number;
  min_relevance?: number;
  risk_level?: string;
}): Promise<Trend[]> => {
  const response = await api.get('/trends', { params });
  return response.data;
};

export const getContentDrafts = async (params?: {
  status?: string;
  platform?: string;
  limit?: number;
}): Promise<ContentDraft[]> => {
  const response = await api.get('/content', { params });
  return response.data;
};

export const getContentDraft = async (id: number): Promise<ContentDraft> => {
  const response = await api.get(`/content/${id}`);
  return response.data;
};

export const approveContent = async (
  contentId: number,
  action: 'approve' | 'reject' | 'edit',
  approvedBy: string,
  editedContent?: string,
  rejectionReason?: string
) => {
  if (action === 'approve') {
    const response = await api.put(`/content/${contentId}/approve`);
    return response.data;
  }

  if (action === 'reject') {
    const response = await api.put(`/content/${contentId}/reject`, {
      rejection_reason: rejectionReason,
      rejected_by: approvedBy,
    });
    return response.data;
  }

  const response = await api.put(`/content/${contentId}/edit`, {
    edited_content: editedContent,
    edited_by: approvedBy,
  });
  return response.data;
};

export const scheduleContent = async (
  contentId: number,
  scheduledFor?: string,
  exportTo?: string
) => {
  const response = await api.post('/content/schedule', {
    content_id: contentId,
    scheduled_for: scheduledFor,
    export_to: exportTo,
  });
  return response.data;
};

export const getStats = async (): Promise<Stats> => {
  const response = await api.get('/stats');
  return response.data;
};

export const triggerIngestion = async () => {
  const response = await api.post('/trends/ingest');
  return response.data;
};

export const triggerScoring = async () => {
  const response = await api.post('/trends/score');
  return response.data;
};

export const triggerContentGeneration = async (limit: number = 5) => {
  const response = await api.post('/content/generate', null, {
    params: { limit },
  });
  return response.data;
};

export const generateContentForTrend = async (trendId: number, params?: { include_blog?: boolean }) => {
  const response = await api.post(`/content/generate/${trendId}`, null, { params });
  return response.data;
};

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const updateConfig = async (key: string, value: any, updatedBy: string) => {
  const response = await api.post('/config', {
    key,
    value,
    updated_by: updatedBy,
  });
  return response.data;
};

export default api;
