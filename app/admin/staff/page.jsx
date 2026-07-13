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
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { PERMISSIONS, ROLES, ROLE_LABELS } from '@/lib/permissions';
import { formatCurrency } from '@/data/services';

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

// Dialog: pick which service packages a plain admin may select in the booking
// flow. "All services" (unrestricted) is represented as a null allowlist; any
// other selection is saved as an explicit array of service ids.
function ServicePermsModal({ admin, services, serviceCategories, onClose, onSave }) {
  const restricted = Array.isArray(admin.allowedServiceIds);
  // Local editable selection — a Set of service ids.
  const [selected, setSelected] = useState(
    () => new Set(restricted ? admin.allowedServiceIds : services.map((s) => s.id))
  );
  const [saving, setSaving] = useState(false);

  const catName = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c.name; });
    return m;
  }, [serviceCategories]);

  // Group services by category slug, preserving service sort order.
  const groups = useMemo(() => {
    const g = new Map();
    services.forEach((s) => {
      const key = s.category || 'other';
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(s);
    });
    return [...g.entries()];
  }, [services]);

  const allSelected = selected.size === services.length;
  const noneSelected = selected.size === 0;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(services.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    // Selecting every service means "no restriction" → save null so newly added
    // services stay available to this admin by default.
    const ids = allSelected ? null : [...selected];
    await onSave(admin, ids);
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card rounded-md max-w-lg w-full flex flex-col max-h-[85vh]"
      >
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/5">
          <div>
            <h3 className="font-serif text-2xl text-cream">Booking services</h3>
            <p className="text-muted text-sm mt-1">
              Choose which packages <span className="text-gold">{admin.email}</span> can
              select when creating a booking.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between text-xs">
          <span className="text-muted">
            {allSelected
              ? 'All services (no restriction)'
              : `${selected.size} of ${services.length} selected`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="px-2.5 py-1 rounded-sm border border-white/10 text-cream/80 hover:border-gold/50 hover:text-gold transition-colors">
              Select all
            </button>
            <button onClick={clearAll} className="px-2.5 py-1 rounded-sm border border-white/10 text-cream/80 hover:border-danger/50 hover:text-danger transition-colors">
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {services.length === 0 && (
            <p className="text-muted text-sm text-center py-6">No services defined yet.</p>
          )}
          {groups.map(([slug, list]) => (
            <div key={slug}>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
                {catName[slug] || slug}
              </div>
              <div className="space-y-1.5">
                {list.map((s) => {
                  const on = selected.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left text-sm border transition-colors ${
                        on
                          ? 'border-gold/50 bg-gold/10 text-cream'
                          : 'border-white/10 bg-surface/40 text-cream/70 hover:border-white/20'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 ${on ? 'bg-gold border-gold text-obsidian' : 'border-white/20'}`}>
                        {on && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1">{s.name}</span>
                      <span className="text-muted text-xs shrink-0">{formatCurrency(s.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 pt-4 border-t border-white/5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || noneSelected}
            title={noneSelected ? 'Select at least one service, or use “Select all”.' : undefined}
            className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffAccess() {
  const { adminUsers, upsertAdminUser, deleteAdminUser, createStaffAccount, showToast, authEmail, services, serviceCategories } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.ADMIN);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // The admin whose booking-service allowlist is being edited (or null).
  const [servicePerms, setServicePerms] = useState(null);

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
    const targetEmail = email.trim().toLowerCase();
    const pw = password.trim();
    if (pw && pw.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setSaving(true);

    // The server route creates the Auth login account (when a password is
    // given), assigns the role, and secures the bootstrap super-admin against
    // lockout — all with the service-role key, so no client RLS limits apply.
    const result = await createStaffAccount({ email: targetEmail, password: pw, role });
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }

    showToast(
      result.accountCreated
        ? `Account created — ${targetEmail} can now sign in as ${ROLE_LABELS[role]}.`
        : `${targetEmail} assigned as ${ROLE_LABELS[role]}.`,
      'success'
    );
    setEmail('');
    setPassword('');
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

  // Persist an admin's booking-service allowlist. `ids === null` clears the
  // restriction (any service); an array limits the booking picker.
  const handleSaveServicePerms = async (u, ids) => {
    const result = await upsertAdminUser({
      id: u.id,
      email: u.email,
      role: u.role,
      allowedServiceIds: ids,
    });
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(
      ids === null
        ? `${u.email} can now book any service.`
        : `Booking services updated for ${u.email}.`,
      'success'
    );
    setServicePerms(null);
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
              Use <span className="text-cream/90">Booking services</span> on an
              Admin row to limit which packages that staff member can pick when
              creating a booking (Super Admins are never limited).
            </p>
            <p className="text-muted">
              Set a password below to create the login account and assign its role
              in one step — no Supabase Dashboard needed. (Requires
              <code className="text-gold/80 mx-1">SUPABASE_SERVICE_ROLE_KEY</code>
              on the server.)
            </p>
          </div>
        </div>

        {/* Add staff */}
        <form onSubmit={handleAdd} className="glass-card rounded-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-xl text-cream">Grant access</h2>
          </div>
          <div className="grid md:grid-cols-[1fr_1fr_150px_auto] gap-3 items-end">
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
                Password
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set an initial password"
                autoComplete="new-password"
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
          <p className="text-xs text-muted mt-3">
            Set a password to create a ready-to-use login account (auto-confirmed,
            min 6 characters) — share it with the staff member. Leave it blank to
            only assign a role to an account that already exists.
          </p>
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
                          {u.role === ROLES.ADMIN && (
                            <button
                              onClick={() => setServicePerms(u)}
                              aria-label={`Set booking services for ${u.email}`}
                              title="Set which services this admin can book"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-cream/80 border border-white/10 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {Array.isArray(u.allowedServiceIds)
                                  ? `${u.allowedServiceIds.length} service${u.allowedServiceIds.length === 1 ? '' : 's'}`
                                  : 'All services'}
                              </span>
                            </button>
                          )}
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

      {/* Booking-service allowlist dialog */}
      {servicePerms && (
        <ServicePermsModal
          admin={servicePerms}
          services={services}
          serviceCategories={serviceCategories}
          onClose={() => setServicePerms(null)}
          onSave={handleSaveServicePerms}
        />
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
