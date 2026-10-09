/**
 * server/authMiddleware.ts
 *
 * Middleware for session authentication and permission authorization.
 * Whitelists public endpoints called by email clients, webhooks, and cron jobs.
 */

import type { Request, Response, NextFunction } from 'express';
import { getSessionTokenFromRequest, verifySessionToken, clearSessionCookie } from './auth.ts';
import { getPermissionsForRole, PermissionKey, UserRole } from './permissions.ts';
import { getDb } from './mongodb.ts';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        permissions: PermissionKey[];
      };
    }
  }
}

/**
 * Public routes that do NOT require session cookies:
 * 1. /api/track/open (and /:leadId, /:leadId/:stage) — 1x1 transparent tracking pixel requested by email clients.
 * 2. /api/track/click — Link redirects clicked by email recipients.
 * 3. /api/webhooks/graph — Microsoft Graph notification receiver (secured via clientState validation).
 * 4. /api/cron/* — Automated maintenance and subscription renewal jobs (secured via cron authorization headers).
 * 5. /api/email/inbound-reply — Webhook receiver for inbound email messages.
 * 6. /api/health — Unauthenticated health check endpoint for monitoring/uptime probes.
 * 7. /api/auth/login — User login endpoint.
 */
export function isPublicRoute(path: string): boolean {
  if (path === '/api/health') return true;
  if (path === '/api/auth/login') return true;
  if (path === '/api/auth/logout') return true;
  if (path === '/api/track/open' || path.startsWith('/api/track/open/')) return true;
  if (path === '/api/track/click') return true;
  if (path === '/api/webhooks/graph') return true;
  if (path.startsWith('/api/cron/')) return true;
  if (path === '/api/email/inbound-reply') return true;
  return false;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check if route is explicitly public
  if (isPublicRoute(req.path)) {
    return next();
  }

  // Non-API routes (e.g. Vite static assets or SPA HTML) are handled by Vite/Express static
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session missing or expired'
    });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    clearSessionCookie(res);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session missing or expired'
    });
  }

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: payload.userId });

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account not found'
      });
    }

    if (!user.isActive) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Account is deactivated'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      mustChangePassword: Boolean(user.mustChangePassword),
      permissions: getPermissionsForRole(user.role)
    };

    return next();
  } catch (err: any) {
    console.error('[Auth Middleware] Database verification error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error'
    });
  }
}

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session missing or expired'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Missing required permission "${permission}"`
      });
    }

    return next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session missing or expired'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access required'
    });
  }

  return next();
}

