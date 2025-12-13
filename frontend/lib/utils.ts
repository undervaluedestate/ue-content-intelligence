/**
 * Utility functions for the dashboard.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    twitter: 'bg-blue-500',
    linkedin: 'bg-blue-700',
    instagram: 'bg-pink-500',
    facebook: 'bg-blue-600',
  };
  return colors[platform.toLowerCase()] || 'bg-gray-500';
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: '𝕏',
    linkedin: 'in',
    instagram: '📷',
    facebook: 'f',
  };
  return icons[platform.toLowerCase()] || '•';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
    published: 'bg-purple-100 text-purple-800 border-purple-300',
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
}

export function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    safe: 'bg-green-100 text-green-800',
    sensitive: 'bg-yellow-100 text-yellow-800',
    avoid: 'bg-red-100 text-red-800',
  };
  return colors[risk.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
