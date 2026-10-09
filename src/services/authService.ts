/**
 * src/services/authService.ts
 *
 * Frontend service for authentication, current user session,
 * password change, and administrative user management.
 */

import { AppUser, UserRole, PermissionKey } from '../types';

type UnauthorizedHandler = (message?: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(message = 'Your session has expired. Please log in again.') {
  if (unauthorizedHandler) {
    unauthorizedHandler(message);
  }
}

/**
 * Fetch wrapper that automatically forwards credentials (cookies)
 * and intercepts 401s to trigger session expired UI.
 */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  };

  const response = await fetch(url, options);

  // If unauthorized on a protected endpoint (and not the login attempt itself), notify listener
  if (response.status === 401 && !url.includes('/api/auth/login')) {
    notifyUnauthorized('Your session has expired. Please log in again.');
  }

  return response;
}

export async function loginApi(email: string, password: string): Promise<{
  success: boolean;
  user?: AppUser;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid email or password' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during login' };
  }
}

export async function logoutApi(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMeApi(): Promise<{
  success: boolean;
  user?: AppUser;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.status === 401) {
      return { success: false, error: 'Unauthorized' };
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to retrieve session' };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function changePasswordApi(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to change password' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listUsersApi(): Promise<{
  success: boolean;
  users?: AppUser[];
  error?: string;
}> {
  try {
    const res = await authFetch('/api/users');
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to load users' };
    }
    return { success: true, users: data.users };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  mustChangePassword?: boolean;
}

export async function createUserApi(
  userData: CreateUserData
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create user' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleUserActiveApi(
  userId: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${userId}/toggle-active`, {
      method: 'POST'
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update user status' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function changeUserRoleApi(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${userId}/change-role`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to change role' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetUserPasswordApi(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to reset password' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUserApi(
  userId: string,
  reassignToUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await authFetch(`/api/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reassignToUserId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to delete user' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

