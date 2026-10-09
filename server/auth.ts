/**
 * server/auth.ts
 *
 * Auth provider layer, password hashing (Node.js crypto.scrypt),
 * signed session tokens (stateless HMAC-SHA256), cookie handling,
 * and persistent brute-force lockout storage in MongoDB.
 */

import crypto from 'crypto';
import type { Request, Response } from 'express';
import { getDb, COLLECTIONS } from './mongodb.ts';
import { getPermissionsForRole, type UserRole } from './permissions.ts';

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface UserDocument extends AuthenticatedUser {
  passwordHash: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AuthProvider {
  authenticate(email: string, password: string): Promise<AuthenticatedUser | null>;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number; // Unix timestamp in ms
}

// ---------------------------------------------------------------------------
// 2. Password Hashing (Node.js crypto.scrypt — Zero Native Modules)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!password || !combinedHash) return resolve(false);
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) return resolve(false);
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Stateless Signed Session Tokens (8-hour expiry)
// ---------------------------------------------------------------------------

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_COOKIE_NAME = 'gini_auth_token';

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.auth_secret || 'gini_outreach_flow_stateless_secret_key_2026';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function createSessionToken(user: { id: string; email: string; role: UserRole }): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');

  try {
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const payloadString = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(payloadString);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 4. Cookie Helpers
// ---------------------------------------------------------------------------

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions: string[] = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`
  ];
  if (isProd) {
    cookieOptions.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export function clearSessionCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions: string[] = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];
  if (isProd) {
    cookieOptions.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export function parseCookies(header?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  const pairs = header.split(';');
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  }
  return cookies;
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[SESSION_COOKIE_NAME]) {
      return cookies[SESSION_COOKIE_NAME];
    }
  }
  // Also support Bearer authorization header for API convenience
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. Persistent Brute-Force Lockout (MongoDB)
// ---------------------------------------------------------------------------
// 5 failed attempts per email+IP blocks for 15 minutes

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkLockout(
  email: string,
  ip: string
): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;

    const record = await db.collection('auth_lockouts').findOne({ key: lockKey });
    if (!record) return { isLocked: false };

    if (record.lockoutUntil) {
      const lockoutExpiry = new Date(record.lockoutUntil).getTime();
      const now = Date.now();
      if (now < lockoutExpiry) {
        const remainingMinutes = Math.ceil((lockoutExpiry - now) / 60000);
        return { isLocked: true, remainingMinutes: Math.max(1, remainingMinutes) };
      } else {
        // Lockout expired; reset counters
        await db.collection('auth_lockouts').deleteOne({ key: lockKey });
        return { isLocked: false };
      }
    }

    return { isLocked: false };
  } catch (err) {
    console.warn('[Auth Lockout] Error checking lockout:', err);
    return { isLocked: false };
  }
}

export async function recordFailedAttempt(
  email: string,
  ip: string
): Promise<{ attempts: number; isLocked: boolean; remainingMinutes?: number }> {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;
    const now = new Date();

    const existing = await db.collection('auth_lockouts').findOne({ key: lockKey });
    const currentAttempts = (existing?.attempts || 0) + 1;

    let lockoutUntil: Date | undefined = undefined;
    let isLocked = false;
    let remainingMinutes: number | undefined = undefined;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      isLocked = true;
      remainingMinutes = 15;
    }

    await db.collection('auth_lockouts').updateOne(
      { key: lockKey },
      {
        $set: {
          key: lockKey,
          email: cleanEmail,
          ip,
          attempts: currentAttempts,
          ...(lockoutUntil ? { lockoutUntil } : {}),
          lastAttemptAt: now
        }
      },
      { upsert: true }
    );

    return { attempts: currentAttempts, isLocked, remainingMinutes };
  } catch (err) {
    console.warn('[Auth Lockout] Error recording failed attempt:', err);
    return { attempts: 1, isLocked: false };
  }
}

export async function clearLockout(email: string, ip: string): Promise<void> {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;
    await db.collection('auth_lockouts').deleteOne({ key: lockKey });
  } catch (err) {
    console.warn('[Auth Lockout] Error clearing lockout:', err);
  }
}

// ---------------------------------------------------------------------------
// 6. User Sanitization
// ---------------------------------------------------------------------------

export function sanitizeUser(user: UserDocument | AuthenticatedUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null
  };
}

// ---------------------------------------------------------------------------
// 7. Auth Provider Layer (LocalAuthProvider + Factory)
// ---------------------------------------------------------------------------

export class LocalAuthProvider implements AuthProvider {
  async authenticate(email: string, password: string): Promise<AuthenticatedUser | null> {
    if (!email || !password) return null;
    const cleanEmail = email.toLowerCase().trim();

    const db = await getDb();
    const userDoc = await db.collection<UserDocument>('users').findOne({ email: cleanEmail });
    if (!userDoc) return null;

    const isValid = await verifyPassword(password, userDoc.passwordHash);
    if (!isValid) return null;

    return sanitizeUser(userDoc);
  }
}

export function getAuthProvider(): AuthProvider {
  const provider = process.env.AUTH_PROVIDER || 'local';
  if (provider === 'local') {
    return new LocalAuthProvider();
  }
  // Designed so external providers can be added in the future with no other changes
  return new LocalAuthProvider();
}

// ---------------------------------------------------------------------------
// 8. Startup Seeding
// ---------------------------------------------------------------------------

export async function seedInitialUsers(): Promise<void> {
  try {
    const db = await getDb();
    const usersCol = db.collection<UserDocument>('users');

    // 1. Seed/Ensure Admin User from environment
    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      process.env.admin_email ||
      'admin@example.com'
    ).toLowerCase().trim();

    const adminPassword =
      process.env.ADMIN_PASSWORD ||
      process.env.admin_password ||
      'AdminPassword123!';

    const now = new Date().toISOString();

    const existingAdmin = await usersCol.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminHash = await hashPassword(adminPassword);
      const adminUser: UserDocument = {
        id: `usr_${Date.now()}_admin`,
        name: process.env.ADMIN_NAME || process.env.admin_name || 'System Admin',
        email: adminEmail,
        passwordHash: adminHash,
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        lastLoginAt: null
      };

      await usersCol.insertOne(adminUser as any);
      console.log(`[Auth] Created admin user: ${adminEmail}`);

      // Ensure personal template set exists for new admin
      try {
        const { createTemplateSetForNewUser } = await import('./templateBackend.ts');
        await createTemplateSetForNewUser(adminUser.id, adminUser.name);
      } catch (err) {
        console.warn('[Auth] Note on admin template set creation:', err);
      }
    } else {
      // If admin exists and ADMIN_PASSWORD / admin_password is set, ensure password is synced
      const explicitPassword = process.env.ADMIN_PASSWORD || process.env.admin_password;
      if (explicitPassword) {
        const adminHash = await hashPassword(explicitPassword);
        await usersCol.updateOne(
          { email: adminEmail },
          { $set: { passwordHash: adminHash, isActive: true, role: 'admin' } }
        );
        console.log(`[Auth] Synced admin password from environment for: ${adminEmail}`);
      }
    }

    // 2. Seed/Ensure standard user if provided in environment
    const userEmailRaw = process.env.USER_EMAIL || process.env.user_email;
    const userPasswordRaw = process.env.USER_PASSWORD || process.env.user_password;
    if (userEmailRaw && userPasswordRaw) {
      const userEmail = userEmailRaw.toLowerCase().trim();
      const existingUser = await usersCol.findOne({ email: userEmail });
      if (!existingUser) {
        const userHash = await hashPassword(userPasswordRaw);
        const standardUser: UserDocument = {
          id: `usr_${Date.now() + 1}_user`,
          name: process.env.USER_NAME || process.env.user_name || 'Standard User',
          email: userEmail,
          passwordHash: userHash,
          role: 'user',
          isActive: true,
          mustChangePassword: false,
          createdAt: now,
          lastLoginAt: null
        };

        await usersCol.insertOne(standardUser as any);
        console.log(`[Auth] Seeded standard user: ${userEmail}`);
        try {
          const { createTemplateSetForNewUser } = await import('./templateBackend.ts');
          await createTemplateSetForNewUser(standardUser.id, standardUser.name);
        } catch {
          // ignore
        }
      } else {
        const userHash = await hashPassword(userPasswordRaw);
        await usersCol.updateOne(
          { email: userEmail },
          { $set: { passwordHash: userHash, isActive: true } }
        );
      }
    }
  } catch (err) {
    console.error('[Auth] Error seeding initial users:', err);
  }
}
