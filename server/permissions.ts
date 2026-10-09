/**
 * server/permissions.ts
 *
 * Central permission definitions and role-permission mappings.
 * All permission keys and roles live in this single file so adding
 * or altering roles/permissions is a clean config-only change.
 */

export const PERMISSION_KEYS = [
  'users.manage',
  'users.changeRoles',
  'leads.create',
  'leads.viewAll',
  'leads.reassign',
  'leads.deleteOwn',
  'leads.deleteAny',
  'campaigns.create',
  'campaigns.run',
  'campaigns.editOwn',
  'campaigns.editAny',
  'templates.editOwn',
  'templates.editAny',
  'templates.editDefault',
  'templates.editHeaderFooter',
  'settings.edit'
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserRole = 'admin' | 'user';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'users.manage',
    'users.changeRoles',
    'leads.create',
    'leads.viewAll',
    'leads.reassign',
    'leads.deleteOwn',
    'leads.deleteAny',
    'campaigns.create',
    'campaigns.run',
    'campaigns.editOwn',
    'campaigns.editAny',
    'templates.editOwn',
    'templates.editAny',
    'templates.editDefault',
    'templates.editHeaderFooter',
    'settings.edit'
  ],
  user: [
    'leads.create',
    'leads.deleteOwn',
    'campaigns.create',
    'campaigns.run',
    'campaigns.editOwn',
    'templates.editOwn'
  ]
};

export function getPermissionsForRole(role: string): PermissionKey[] {
  if (role in ROLE_PERMISSIONS) {
    return [...ROLE_PERMISSIONS[role as UserRole]];
  }
  return [];
}

export function roleHasPermission(role: string, permission: PermissionKey): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
