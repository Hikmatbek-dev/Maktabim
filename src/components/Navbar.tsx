'use client';

import React, { useState } from 'react';
import { User, School } from '@/lib/types';
import { RoleBadge } from './RoleBadge';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  user: User;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
  schools?: School[];
  currentSchoolId?: string;
  onSchoolChange?: (schoolId: string) => void;
  onExportExcel?: () => void;
}

export function Navbar({
  user,
  selectedDate,
  onDateChange,
  onRefresh,
  schools = [],
  currentSchoolId,
  onSchoolChange,
  onExportExcel,
}: NavbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

  const handleQuickSwitch = async (username: string) => {
    setShowSwitchMenu(false);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password:
            username === 'admin'
              ? 'admin123'
              : username === 'direktor'
              ? 'direktor123'
              : username === 'zamdirektor'
              ? 'zam123'
              : username === 'davomatchi'
              ? 'davomat123'
              : 'ustoz123',
        }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentSchool = schools.find((s) => s.id === currentSchoolId) || schools[0];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#C4C5D7]/50 shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Organization Picker */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-[17px] font-bold text-[#0037B0] tracking-tight block leading-tight">
                Maktabim EdTech
              </span>
              <span className="text-[11px] text-[#434655] font-medium block">
                Davomat monitoring tizimi
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#C4C5D7]/60 hidden md:block"></div>

          {/* School Picker Menu */}
          {user.role === 'SUPER_ADMIN' && schools.length > 0 && onSchoolChange ? (
            <div className="relative">
              <div className="flex items-center gap-2 bg-[#F2F3FF] hover:bg-[#EAEDFF] transition-colors duration-150 px-3 py-1.5 rounded-xl border border-[#C4C5D7]/70 text-[#131B2E]">
                <span className="material-symbols-outlined text-[#1D4ED8] text-[20px]">domain</span>
                <select
                  value={currentSchoolId || schools[0]?.id}
                  onChange={(e) => onSchoolChange(e.target.value)}
                  className="bg-transparent text-[13px] font-semibold text-[#131B2E] focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[#747686] text-[18px] pointer-events-none -ml-2">
                  expand_more
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#F2F3FF] px-3 py-1.5 rounded-xl border border-[#C4C5D7]/50 text-[#131B2E] max-w-[220px] sm:max-w-xs truncate">
              <span className="material-symbols-outlined text-[#1D4ED8] text-[20px] shrink-0">domain</span>
              <span className="text-[13px] font-semibold text-[#131B2E] truncate">
                {currentSchool?.name || user.school_name || '1-sonli maktab'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Date picker & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F2F3FF] rounded-xl px-2.5 py-1.5 border border-[#C4C5D7]/70">
            <span className="material-symbols-outlined text-[#1D4ED8] text-[18px] mr-1 hidden sm:block">
              calendar_today
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-[#131B2E] font-semibold py-0.5 px-1 focus:outline-none cursor-pointer text-[13px]"
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Ma'lumotlarni yangilash"
              className="p-2 rounded-xl text-[#434655] hover:text-[#1D4ED8] hover:bg-[#F2F3FF] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">sync</span>
            </button>
          )}
        </div>

        {/* Right side controls: Role switch & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick role switch for demo */}
          <div className="relative">
            <button
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              title="Rolni almashtirish (Test)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#131B2E] bg-[#F2F3FF] hover:bg-[#EAEDFF] rounded-xl border border-[#C4C5D7]/70 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[#1D4ED8] text-[18px]">badge</span>
              <span className="hidden md:inline">Rol almashtirish</span>
            </button>

            {showSwitchMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#C4C5D7]/70 py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#747686] uppercase tracking-wider">
                  Tezkor rollar (Stitch Demo)
                </div>
                <button
                  onClick={() => handleQuickSwitch('davomatchi')}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#EFF6FF] text-[#131B2E] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1D4ED8] text-[18px]">checklist</span>
                    Davomatchi (Mobil)
                  </span>
                </button>
                <button
                  onClick={() => handleQuickSwitch('ustoz')}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#ECFDF5] text-[#131B2E] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006C49] text-[18px]">school</span>
                    Sinf rahbari (5-A)
                  </span>
                </button>
                <button
                  onClick={() => handleQuickSwitch('direktor')}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#EFF6FF] text-[#131B2E] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0037B0] text-[18px]">analytics</span>
                    Direktor (Desktop)
                  </span>
                </button>
                <button
                  onClick={() => handleQuickSwitch('zamdirektor')}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#EFF6FF] text-[#131B2E] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0037B0] text-[18px]">supervisor_account</span>
                    Zamdirektor
                  </span>
                </button>
                <button
                  onClick={() => handleQuickSwitch('admin')}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#FDF2F8] text-[#131B2E] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8E0028] text-[18px]">admin_panel_settings</span>
                    Super Admin
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-[13px] font-semibold text-[#131B2E] leading-tight">
                {user.name}
              </span>
              <span className="text-[11px] text-[#434655]">
                {user.role === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : user.role === 'DIRECTOR'
                  ? 'Maktab Direktori'
                  : user.role === 'DEPUTY_DIRECTOR'
                  ? 'O‘IBDO‘ (Zamdirektor)'
                  : user.role === 'INSPECTOR'
                  ? 'Davomatchi'
                  : 'Sinf Rahbari'}
              </span>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Tizimdan chiqish"
            className="p-2 rounded-xl text-[#747686] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/40 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
