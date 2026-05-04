'use client';

import { useState } from 'react';
import { usePlatformStore } from '@/store/platform-store';

const roleLabel: Record<string, string> = {
  super_admin: 'Quản trị viên hệ thống',
  admin: 'Admin',
  manager: 'Quản lý',
  employee: 'Nhân viên',
  viewer: 'Viewer',
};

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export default function AccountPage() {
  const currentUser = usePlatformStore((s) => s.currentUser);
  const setCurrentUser = usePlatformStore((s) => s.setCurrentUser);

  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // Profile form state
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Chưa đăng nhập.
      </div>
    );
  }

  const initials = getInitials(currentUser.fullName);

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Họ và tên không được để trống.' });
      return;
    }
    setProfileSaving(true);
    const user = currentUser;
    // Simulate async save (no backend yet)
    setTimeout(() => {
      if (!user) return;
      setCurrentUser({ ...user, fullName: fullName.trim(), phone: phone.trim() || undefined });
      setProfileMsg({ type: 'success', text: 'Thông tin đã được cập nhật thành công.' });
      setProfileSaving(false);
    }, 600);
  }

  function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw) {
      setPwMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Xác nhận mật khẩu không khớp.' });
      return;
    }
    setPwSaving(true);
    setTimeout(() => {
      setPwMsg({ type: 'success', text: 'Mật khẩu đã được thay đổi thành công.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSaving(false);
    }, 600);
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-teal-200">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{currentUser.fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentUser.email}</p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 text-xs bg-teal-50 text-teal-700 rounded-full font-medium border border-teal-100">
            {roleLabel[currentUser.globalRole] ?? currentUser.globalRole}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {(['profile', 'password'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'profile' ? 'Thông tin cá nhân' : 'Đổi mật khẩu'}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
              placeholder="Nhập họ và tên"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={currentUser.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
              placeholder="Nhập số điện thoại"
              type="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vai trò</label>
            <input
              value={roleLabel[currentUser.globalRole] ?? currentUser.globalRole}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          {profileMsg && (
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
                profileMsg.type === 'success'
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {profileSaving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Lưu thay đổi
          </button>
        </form>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
            />
          </div>

          {pwMsg && (
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
                pwMsg.type === 'success'
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {pwMsg.type === 'success' ? (
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {pwSaving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Đổi mật khẩu
          </button>
        </form>
      )}
    </div>
  );
}
