'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('adminToken') : null;
    if (token) {
      setMessage('You appear to already be logged in. You can go to the dashboard.');
    }
  }, []);

  const handleLogin = async () => {
    setMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error('No access token returned');
      }

      window.localStorage.setItem('adminToken', accessToken);

      // Verify admin access via backend
      await api.get('/auth/me');

      window.location.href = '/';
    } catch (err: any) {
      window.localStorage.removeItem('adminToken');
      await supabase.auth.signOut();

      const msg = typeof err?.message === 'string' ? err.message : 'Login failed';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to access ingestion, scoring, generation, and review tools.</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {message && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-xs text-gray-500">
            Your Supabase access token is stored in your browser localStorage as <code>adminToken</code>.
          </p>
        </div>
      </main>
    </div>
  );
}
