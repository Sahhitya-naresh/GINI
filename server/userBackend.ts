/**
 * server/userBackend.ts
 *
 * User management operations in MongoDB collection "users".
 * Enforces business rules:
 * - Sanitization (never leak passwordHash)
 * - Cannot deactivate or demote oneself
 * - The last active administrator can never be deactivated or demoted
 * - Case-insensitive email uniqueness
 */

import { getDb } from './mongodb.ts';
import {
  UserDocument,
  SanitizedUser,
  sanitizeUser,
  hashPassword,
  verifyPassword
} from './auth.ts';
import { UserRole } from './permissions.ts';

export async function listUsers(): Promise<SanitizedUser[]> {
  const db = await getDb();
  const users = await db
    .collection<UserDocument>('users')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return users.map(sanitizeUser);
}

export async function getUserById(id: string): Promise<SanitizedUser | null> {
  const db = await getDb();
  const user = await db.collection<UserDocument>('users').findOne({ id });
  return user ? sanitizeUser(user) : null;
}

export async function getUserByEmail(email: string): Promise<SanitizedUser | null> {
  const db = await getDb();
  const user = await db.collection<UserDocument>('users').findOne({
    email: email.toLowerCase().trim()
  });
  return user ? sanitizeUser(user) : null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  mustChangePassword?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<SanitizedUser> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  const cleanEmail = (input.email || '').toLowerCase().trim();
  const cleanName = (input.name || '').trim();
  const role: UserRole = input.role === 'admin' ? 'admin' : 'user';

  if (!cleanEmail || !cleanName) {
    throw new Error('Name and email are required');
  }

  // Check email uniqueness
  const existing = await usersCol.findOne({ email: cleanEmail });
  if (existing) {
    throw new Error(`A user with email "${cleanEmail}" already exists`);
  }

  const rawPassword = input.password || 'TempPassword123!';
  const passwordHash = await hashPassword(rawPassword);
  const now = new Date().toISOString();

  const userDoc: UserDocument = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role,
    isActive: true,
    mustChangePassword: input.mustChangePassword !== false, // default true for admin-created users
    createdAt: now,
    lastLoginAt: null
  };

  await usersCol.insertOne(userDoc as any);

  try {
    const { createTemplateSetForNewUser } = await import('./templateBackend.ts');
    await createTemplateSetForNewUser(userDoc.id, userDoc.name);
  } catch (tErr) {
    console.warn('[UserBackend] Failed to create template set for new user:', tErr);
  }

  return sanitizeUser(userDoc);
}

export async function toggleUserActive(
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: 'User not found' };
  }

  // Rule: Nobody can deactivate themselves
  if (targetUserId === requestingUserId && target.isActive) {
    return { success: false, error: 'You cannot deactivate your own account.' };
  }

  // Rule: Last active admin cannot be deactivated
  if (target.isActive && target.role === 'admin') {
    const activeAdminsCount = await usersCol.countDocuments({
      role: 'admin',
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: 'Cannot deactivate the last active administrator.' };
    }
  }

  const newStatus = !target.isActive;
  await usersCol.updateOne({ id: targetUserId }, { $set: { isActive: newStatus } });

  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : undefined };
}

export async function changeUserRole(
  targetUserId: string,
  newRole: UserRole,
  requestingUserId: string
): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  if (newRole !== 'admin' && newRole !== 'user') {
    return { success: false, error: 'Invalid role. Allowed roles are "admin" or "user".' };
  }

  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: 'User not found' };
  }

  if (target.role === newRole) {
    return { success: true, user: sanitizeUser(target) };
  }

  // Rule: Nobody can demote themselves
  if (targetUserId === requestingUserId && target.role === 'admin' && newRole !== 'admin') {
    return { success: false, error: 'You cannot demote yourself from administrator.' };
  }

  // Rule: Last active admin cannot be demoted
  if (target.role === 'admin' && newRole !== 'admin' && target.isActive) {
    const activeAdminsCount = await usersCol.countDocuments({
      role: 'admin',
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: 'Cannot demote the last active administrator.' };
    }
  }

  await usersCol.updateOne({ id: targetUserId }, { $set: { role: newRole } });
  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : undefined };
}

export async function resetUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: 'User not found' };
  }

  const passwordHash = await hashPassword(newPassword);
  await usersCol.updateOne(
    { id: targetUserId },
    {
      $set: {
        passwordHash,
        mustChangePassword: true
      }
    }
  );

  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : undefined };
}

export async function changeOwnPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const user = await usersCol.findOne({ id: userId });
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const isOldValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isOldValid) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  const passwordHash = await hashPassword(newPassword);
  await usersCol.updateOne(
    { id: userId },
    {
      $set: {
        passwordHash,
        mustChangePassword: false
      }
    }
  );

  const updated = await usersCol.findOne({ id: userId });
  return { success: true, user: updated ? sanitizeUser(updated) : undefined };
}

export async function deleteUser(
  targetUserId: string,
  reassignToUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; reassignedLeads?: number; reassignedCampaigns?: number; error?: string }> {
  const db = await getDb();
  const usersCol = db.collection<UserDocument>('users');

  if (targetUserId === requestingUserId) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: 'Target user not found' };
  }

  // Last active admin protection
  if (target.role === 'admin' && target.isActive) {
    const activeAdminsCount = await usersCol.countDocuments({
      role: 'admin',
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: 'Cannot delete the last active administrator.' };
    }
  }

  if (!reassignToUserId || reassignToUserId === targetUserId) {
    return { success: false, error: 'A different active user must be chosen to inherit leads and campaigns.' };
  }

  const replacement = await usersCol.findOne({ id: reassignToUserId });
  if (!replacement || !replacement.isActive) {
    return { success: false, error: 'Replacement user not found or inactive.' };
  }

  const now = new Date().toISOString();

  // Reassign all leads owned by target user with audit note
  const leadsCol = db.collection('leads');
  const targetLeads = await leadsCol.find({ ownerId: targetUserId }).toArray();
  for (const l of targetLeads) {
    const auditNote = `[Reassigned from ${target.name} (${target.id}) to ${replacement.name} (${replacement.id}) on account deletion by ${requestingUserId} on ${now}]`;
    const newNotes = l.notes && l.notes.trim() ? `${l.notes.trim()} | ${auditNote}` : auditNote;
    await leadsCol.updateOne(
      { leadId: l.leadId },
      {
        $set: {
          ownerId: replacement.id,
          ownerName: replacement.name,
          lastModifiedBy: requestingUserId,
          notes: newNotes,
          updatedAt: now
        }
      }
    );
  }


  // Reassign all campaigns owned by target user
  const campaignsCol = db.collection('campaigns');
  const campaignRes = await campaignsCol.updateMany(
    { ownerId: targetUserId },
    {
      $set: {
        ownerId: replacement.id,
        ownerName: replacement.name,
        lastEditedBy: requestingUserId,
        updated_date: now
      }
    }
  );

  // Delete user
  await usersCol.deleteOne({ id: targetUserId });

  // Delete user's personal template set (campaign sets remain with campaigns)
  try {
    const { deleteUserTemplateSet } = await import('./templateBackend.ts');
    await deleteUserTemplateSet(targetUserId);
  } catch (tErr) {
    console.warn('[UserBackend] Failed to delete personal template set on user deletion:', tErr);
  }

  return {
    success: true,
    reassignedLeads: targetLeads.length,
    reassignedCampaigns: campaignRes.modifiedCount
  };
}

