import type { Request } from 'express';

/**
 * Returns the reliable public base URL in strict order:
 * 1. process.env.APP_URL (stripped of trailing slashes, forcing https in production/Vercel)
 * 2. https://${process.env.VERCEL_PROJECT_PRODUCTION_URL} when present
 * 3. Request host (forcing https in production/Vercel, never falling back to localhost on Vercel)
 * 4. Fallback to process.env.VERCEL_URL if on Vercel, else request host / localhost:3000
 */
export function getPublicBaseUrl(req?: Request): string {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  const isProduction = process.env.NODE_ENV === 'production' || isVercel;

  // 1. process.env.APP_URL (stripped of trailing slashes)
  const envAppUrl = process.env.APP_URL?.trim();
  if (envAppUrl) {
    let clean = envAppUrl.replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    // Always force https in production
    if (isProduction && clean.startsWith('http://')) {
      clean = clean.replace(/^http:\/\//, 'https://');
    }
    return clean;
  }

  // 2. https://${process.env.VERCEL_PROJECT_PRODUCTION_URL} when present
  const vercelProjectProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProjectProd) {
    const clean = vercelProjectProd.replace(/\/+$/, '').replace(/^https?:\/\//, '');
    return `https://${clean}`;
  }

  // 3. Fallback to process.env.VERCEL_URL when present (standard Vercel system variable)
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (isVercel && vercelUrl) {
    const clean = vercelUrl.replace(/\/+$/, '').replace(/^https?:\/\//, '');
    return `https://${clean}`;
  }

  // 4. Request host
  if (req) {
    const forwardedHost = (req.headers['x-forwarded-host'] as string) || '';
    const hostHeader = req.get('host') || '';
    const host = forwardedHost.split(',')[0].trim() || hostHeader;

    // Never fall back to localhost when running on Vercel
    if (isVercel && (!host || host.includes('localhost') || host.includes('127.0.0.1'))) {
      if (vercelProjectProd) {
        return `https://${vercelProjectProd.replace(/\/+$/, '').replace(/^https?:\/\//, '')}`;
      }
      if (vercelUrl) {
        return `https://${vercelUrl.replace(/\/+$/, '').replace(/^https?:\/\//, '')}`;
      }
    }

    if (host) {
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || '';
      const isHttps = isProduction || forwardedProto === 'https' || req.protocol === 'https';
      const proto = isHttps ? 'https' : 'http';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // If on Vercel or production and no request object available
  if (isVercel || isProduction) {
    if (vercelProjectProd) {
      return `https://${vercelProjectProd.replace(/\/+$/, '').replace(/^https?:\/\//, '')}`;
    }
    if (vercelUrl) {
      return `https://${vercelUrl.replace(/\/+$/, '').replace(/^https?:\/\//, '')}`;
    }
  }

  return 'http://localhost:3000';
}
