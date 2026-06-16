'use client';

import { useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
  Crown,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { PERMISSIONS, ROLES, ROLE_LABELS } from '@/lib/permissions';

function RoleBadge({ role }) {
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/30">
        <Crown className="w-3 h-3" />
        {ROLE_LABELS[ROLES.SUPER_ADMIN]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-cream/80 border border-white/10">
      <ShieldCheck className="w-3 h-3" />
      {ROLE_LABELS[ROLES.ADMIN]}
    </span>
  );
}

function StaffAccess() {
  const { adminUsers, upsertAdminUser, deleteAdminUser, showToast, authEmail } = useApp();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.ADMIN);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const superAdminCount = useMemo(
    () => adminUsers.filter((u) => u.role === ROLES.SUPER_ADMIN).length,
    [adminUsers]
  );

  // Lockout guard: once any role exists, an unlisted email drops to plain
  // 'admin'. If the current user isn't listed as super_admin, warn them to add
  // their own email before they navigate away and lose access to this page.
  const selfIsSuperAdmin = useMemo(
    () =>
      adminUsers.some(
        (u) => u.email === authEmail && u.role === ROLES.SUPER_ADMIN
      ),
    [adminUsers, authEmail]
  );
  const showLockoutWarning =
    adminUsers.length > 0 && authEmail && !selfIsSuperAdmin;

  const addSelfAsSuperAdmin = async () => {
    const result = await upsertAdminUser({ email: authEmail, role: ROLES.SUPER_ADMIN });
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('You are now saved as Super Admin.', 'success');
  };

  const sorted = useMemo(
    () =>
      [...adminUsers].sort((a, b) => {
        if (a.role !== b.role) return a.role === ROLES.SUPER_ADMIN ? -1 : 1;
        return (a.email || '').localeCompare(b.email || '');
      }),
    [adminUsers]
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await upsertAdminUser({ email, role });
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(`${email.trim().toLowerCase()} added as ${ROLE_LABELS[role]}.`, 'success');
    setEmail('');
    setRole(ROLES.ADMIN);
  };

  // Demoting the last super admin would lock everyone out of sensitive pages.
  const isLastSuperAdmin = (u) =>
    u.role === ROLES.SUPER_ADMIN && superAdminCount <= 1;

  const handleRoleChange = async (u, nextRole) => {
    if (nextRole === u.role) return;
    if (nextRole === ROLES.ADMIN && isLastSuperAdmin(u)) {
      showToast('At least one Super Admin is required.', 'error');
      return;
    }
    const result = await upsertAdminUser({ id: u.id, email: u.email, role: nextRole });
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(`${u.email} is now ${ROLE_LABELS[nextRole]}.`, 'success');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (isLastSuperAdmin(confirmDelete)) {
      showToast('At least one Super Admin is required.', 'error');
      setConfirmDelete(null);
      return;
    }
    const result = await deleteAdminUser(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Access removed.', 'info');
    setConfirmDelete(null);
  };

  return (
    <AdminLayout title="Staff Access">
      <div className="max-w-4xl space-y-6">
        {/* Lockout warning */}
        {showLockoutWarning && (
          <div className="glass-card rounded-md p-5 flex gap-3 text-sm border border-danger/40 bg-danger/10">
            <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="space-y-2 leading-relaxed">
              <p className="text-cream">
                Your account (<span className="text-gold">{authEmail}</span>) is not
                listed as a Super Admin. As soon as another role exists, you'll be
                treated as a limited Admin and lose access to this page.
              </p>
              <button
                onClick={addSelfAsSuperAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-xs font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Add me as Super Admin
              </button>
            </div>
          </div>
        )}

        {/* Intro / how it works */}
        <div className="glass-card rounded-md p-5 flex gap-3 text-sm text-cream/80 border border-gold/20">
          <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <p>
              Control who can do what in the admin console. Roles are matched by
              login email.
            </p>
            <ul className="list-disc list-inside text-muted space-y-0.5">
              <li>
                <span className="text-gold">Super Admin</span> — full access to
                everything (members, settings, services, staff, booking edits).
              </li>
              <li>
                <span className="text-cream/90">Admin</span> — can create and view
                bookings, schedule and the shop monitor. Cannot edit bookings or
                open sensitive pages (members, cars, coffees, settings).
              </li>
            </ul>
            <p className="text-muted">
              Accounts are still created in the Supabase Dashboard
              (Authentication → Users). Add the same email here to grant a role.
            </p>
          </div>
        </div>

        {/* Add staff */}
        <form onSubmit={handleAdd} className="glass-card rounded-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-xl text-cream">Grant access</h2>
          </div>
          <div className="grid md:grid-cols-[1fr_180px_auto] gap-3 items-end">
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
                Login email
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="barista@samahuzai.com"
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors"
              />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
                Role
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>
                <option value={ROLES.SUPER_ADMIN}>{ROLE_LABELS[ROLES.SUPER_ADMIN]}</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>

        {/* Staff list */}
        <div className="glass-card rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-serif text-xl text-cream">Staff with access</h2>
            <span className="text-xs text-muted">{adminUsers.length} total</span>
          </div>

          {sorted.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted text-sm">
              <ShieldAlert className="w-6 h-6 text-muted/60 mx-auto mb-3" />
              No roles assigned yet. While this list is empty, the first signed-in
              account is treated as Super Admin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-6 py-3 text-cream">{u.email}</td>
                      <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="bg-surface/70 border border-white/10 rounded-sm py-1.5 px-2 text-xs text-cream focus:outline-none focus:border-gold/50 transition-colors"
                            aria-label={`Change role for ${u.email}`}
                          >
                            <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>
                            <option value={ROLES.SUPER_ADMIN}>{ROLE_LABELS[ROLES.SUPER_ADMIN]}</option>
                          </select>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            aria-label={`Remove access for ${u.email}`}
                            className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Remove access?</h3>
                <p className="text-muted text-sm mt-1">
                  This revokes the assigned role. The Supabase Auth account itself
                  is not deleted.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 flex items-center gap-3">
              <RoleBadge role={confirmDelete.role} />
              <span className="text-cream">{confirmDelete.email}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function StaffAccessPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.STAFF_MANAGE}>
      <StaffAccess />
    </ProtectedRoute>
  );
}
