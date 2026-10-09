import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Key, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  UserX, 
  UserCheck, 
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import {
  listUsersApi,
  createUserApi,
  toggleUserActiveApi,
  changeUserRoleApi,
  resetUserPasswordApi,
  deleteUserApi
} from '../services/authService';

interface UsersPageProps {
  currentUser: AppUser;
}

export const UsersPage: React.FC<UsersPageProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newPassword, setNewPassword] = useState('');
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [copiedResetPassword, setCopiedResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [reassignToUserId, setReassignToUserId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const canChangeRoles = currentUser.permissions?.includes('users.changeRoles') ?? true;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const result = await listUsersApi();
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setErrorBanner(result.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Error loading users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAddModal = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('user');
    setNewPassword(generateRandomPassword());
    setCopiedTempPassword(false);
    setAddModalError(null);
    setShowAddModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setAddModalError('Name, email, and password are required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createUserApi({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        password: newPassword.trim(),
        mustChangePassword: true
      });

      if (result.success) {
        setShowAddModal(false);
        setSuccessBanner(`User "${newName}" successfully created with temporary credentials.`);
        setTimeout(() => setSuccessBanner(null), 5000);
        await loadUsers();
      } else {
        setAddModalError(result.error || 'Failed to create user');
      }
    } catch (err: any) {
      setAddModalError(err.message || 'Error creating user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (targetUser: AppUser) => {
    setErrorBanner(null);
    try {
      const result = await toggleUserActiveApi(targetUser.id);
      if (result.success) {
        const actionStr = targetUser.isActive ? 'deactivated' : 'reactivated';
        setSuccessBanner(`User "${targetUser.name}" has been ${actionStr}.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        await loadUsers();
      } else {
        setErrorBanner(result.error || 'Failed to update user status');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Error updating status');
    }
  };

  const handleChangeRole = async (targetUser: AppUser, newRole: UserRole) => {
    setErrorBanner(null);
    try {
      const result = await changeUserRoleApi(targetUser.id, newRole);
      if (result.success) {
        setSuccessBanner(`Role for "${targetUser.name}" updated to ${newRole.toUpperCase()}.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        await loadUsers();
      } else {
        setErrorBanner(result.error || 'Failed to update user role');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Error updating role');
    }
  };

  const handleOpenResetModal = (user: AppUser) => {
    setResetTargetUser(user);
    setResetPasswordValue(generateRandomPassword());
    setCopiedResetPassword(false);
    setResetModalError(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTargetUser || !resetPasswordValue.trim()) return;

    setIsResetting(true);
    setResetModalError(null);
    try {
      const result = await resetUserPasswordApi(resetTargetUser.id, resetPasswordValue.trim());
      if (result.success) {
        setResetTargetUser(null);
        setSuccessBanner(`Password reset for "${resetTargetUser.name}". User must change it on next login.`);
        setTimeout(() => setSuccessBanner(null), 5000);
        await loadUsers();
      } else {
        setResetModalError(result.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setResetModalError(err.message || 'Error resetting password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenDeleteModal = (user: AppUser) => {
    setUserToDelete(user);
    const activeOthers = users.filter((u) => u.id !== user.id && u.isActive);
    setReassignToUserId(activeOthers.length > 0 ? activeOthers[0].id : '');
    setDeleteModalError(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete || !reassignToUserId) return;

    setIsDeleting(true);
    setDeleteModalError(null);
    try {
      const result = await deleteUserApi(userToDelete.id, reassignToUserId);
      if (result.success) {
        const deletedName = userToDelete.name;
        setUserToDelete(null);
        setSuccessBanner(`User "${deletedName}" was deleted and their leads and campaigns reassigned.`);
        setTimeout(() => setSuccessBanner(null), 5000);
        await loadUsers();
      } else {
        setDeleteModalError(result.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setDeleteModalError(err.message || 'Error deleting user');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const activeAdminCount = users.filter((u) => u.role === 'admin' && u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              User Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
              {users.length} {users.length === 1 ? 'User' : 'Users'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system access, assign roles, enforce temporary passwords, and control team activations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title="Refresh users list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
          </button>

          <button
            id="btn-add-new-user"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs shadow-red-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-red-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="p-1 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="p-1 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                    <span>Loading team members...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No users found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search criteria or add a new team member.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const isLastAdmin = user.role === 'admin' && user.isActive && activeAdminCount <= 1;

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${!user.isActive ? 'opacity-60 bg-slate-50/40' : ''}`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  You
                                </span>
                              )}
                              {user.mustChangePassword && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800" title="User must change password upon next login">
                                  Temp Pwd
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {canChangeRoles ? (
                          <select
                            value={user.role}
                            disabled={isSelf || (isLastAdmin && user.role === 'admin')}
                            onChange={(e) => handleChangeRole(user, e.target.value as UserRole)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              user.role === 'admin'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={
                              isSelf 
                                ? 'You cannot demote yourself' 
                                : isLastAdmin 
                                ? 'Cannot demote the last active admin' 
                                : 'Change user role'
                            }
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            <span className="capitalize">{user.role}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(user)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Reset Password (forces change on login)"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            type="button"
                            disabled={isSelf || (isLastAdmin && user.isActive)}
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              user.isActive
                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={
                              isSelf
                                ? 'Cannot deactivate your own account'
                                : isLastAdmin && user.isActive
                                ? 'Cannot deactivate the last active admin'
                                : user.isActive
                                ? 'Deactivate user'
                                : 'Reactivate user'
                            }
                          >
                            {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            disabled={isSelf || (isLastAdmin && user.role === 'admin')}
                            onClick={() => handleOpenDeleteModal(user)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              isSelf
                                ? 'Cannot delete your own account'
                                : isLastAdmin && user.role === 'admin'
                                ? 'Cannot delete the last active admin'
                                : 'Delete user and reassign data'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Team Member</h3>
                  <p className="text-xs text-slate-500">Create login credentials and assign role permissions</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addModalError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{addModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  id="new-user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-semibold"
                >
                  <option value="user">User (Standard Outreach Access)</option>
                  <option value="admin">Admin (Full Control + User Management)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword(generateRandomPassword());
                      setCopiedTempPassword(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="new-user-temp-password"
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setCopiedTempPassword(false);
                    }}
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setCopiedTempPassword(true);
                      setTimeout(() => setCopiedTempPassword(false), 2000);
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedTempPassword ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  User will be forced to change this password on their initial login.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-create-user"
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset User Password</h3>
                  <p className="text-xs text-slate-500">For {resetTargetUser.name} ({resetTargetUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetModalError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{resetModalError}</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetPasswordValue(generateRandomPassword());
                      setCopiedResetPassword(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={resetPasswordValue}
                    onChange={(e) => {
                      setResetPasswordValue(e.target.value);
                      setCopiedResetPassword(false);
                    }}
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPasswordValue);
                      setCopiedResetPassword(true);
                      setTimeout(() => setCopiedResetPassword(false), 2000);
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedResetPassword ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  User will be forced to change this password on their next login.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={isResetting || !resetPasswordValue.trim()}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Set Temporary Password</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Delete User</h3>
                  <p className="text-[11px] text-slate-500">Reassign leads and workflows before deletion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to delete user <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.email}).
                All active leads and campaigns owned by this user must be reassigned to another active team member.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reassign All Data To:
                </label>
                <select
                  value={reassignToUserId}
                  onChange={(e) => setReassignToUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                >
                  {users
                    .filter((u) => u.id !== userToDelete.id && u.isActive)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role}
                      </option>
                    ))}
                </select>
                {users.filter((u) => u.id !== userToDelete.id && u.isActive).length === 0 && (
                  <p className="text-[11px] text-red-600 mt-1">
                    No active replacement users available. Create or activate another user first.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeleting || !reassignToUserId}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reassigning & Deleting...</span>
                    </>
                  ) : (
                    <span>Delete & Reassign Data</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
