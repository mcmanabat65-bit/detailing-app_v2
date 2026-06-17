'use client';

import { useEffect, useState } from 'react';
import { Lock, Mail, Save, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';

function Profile() {
  const { currentMember, updateOwnMemberProfile, updateOwnPassword, showToast } = useApp();
  const member = currentMember;

  const [form, setForm] = useState({ name: '', nickname: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || '',
        nickname: member.nickname || '',
        phone: member.phone || '',
      });
    }
  }, [member]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateOwnMemberProfile(form);
    setSavingProfile(false);
    if (res?.error) showToast(res.error, 'error');
    else showToast('Profile updated.', 'success');
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setSavingPw(true);
    const res = await updateOwnPassword(pw.password);
    setSavingPw(false);
    if (res?.error) showToast(res.error, 'error');
    else {
      showToast('Password changed.', 'success');
      setPw({ password: '', confirm: '' });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile details */}
      <form onSubmit={handleSaveProfile} className="glass-card rounded-md p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl text-cream">Profile details</h2>
        </div>

        <Field label="Full Name *">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="portal-input"
            placeholder="Maria Santos"
          />
        </Field>

        <Field label="Nickname / Alias (Optional)">
          <input
            type="text"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            className="portal-input"
            placeholder="e.g. Boss, Kuya"
          />
        </Field>

        <Field label="Phone *">
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="portal-input"
            placeholder="0917 123 4567"
          />
        </Field>

        <Field label="Email (linked to your login)">
          <div className="relative">
            <Mail className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              disabled
              value={member?.email || ''}
              className="portal-input pl-10 opacity-70 cursor-not-allowed"
            />
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Contact the shop to change the email tied to your membership.
          </p>
        </Field>

        <button
          type="submit"
          disabled={savingProfile}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={handleSavePassword} className="glass-card rounded-md p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl text-cream">Change password</h2>
        </div>

        <Field label="New password">
          <input
            type="password"
            required
            minLength={6}
            value={pw.password}
            onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
            className="portal-input"
            placeholder="At least 6 characters"
          />
        </Field>

        <Field label="Confirm new password">
          <input
            type="password"
            required
            minLength={6}
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            className="portal-input"
            placeholder="••••••••"
          />
        </Field>

        <button
          type="submit"
          disabled={savingPw}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-60"
        >
          <Lock className="w-4 h-4" />
          {savingPw ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <style jsx>{`
        .portal-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
        }
        .portal-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}

export default function PortalProfilePage() {
  return (
    <MemberRoute>
      <PortalLayout title="Profile">
        <Profile />
      </PortalLayout>
    </MemberRoute>
  );
}
