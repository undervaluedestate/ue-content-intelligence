import type { NextFunction, Request, Response } from 'express';
import { createSupabaseClient } from '../config/supabase';

function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }

    const supabase = createSupabaseClient(token);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (adminError) {
      return res.status(500).json({ error: 'Failed to verify admin access' });
    }

    if (!adminRow) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).accessToken = token;
    (req as any).user = userData.user;

    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
