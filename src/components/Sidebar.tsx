'use client';

import React from 'react';
import { User, School } from '@/lib/types';
import { useRouter } from 'next/navigation';

export type NavSection = 
  | 'director_summary'    // 1. Maktab bo'yicha kunlik xulosa
  | 'classes'             // 2. Sinflar
  | 'attendance_reports'  // 3. Davomat Ma'lumoti (xulosa keladi)
  | 'staff'               // 4. Xodimlar
  | 'inspector_monitor'   // Davomatchi: Qisqacha Monitoring
  | 'inspector_classes'   // Davomatchi: Umumiy Sinflar (ichiga kirib davomat qilish)
  | 'teacher_monitor'     // Ustoz: Sinf monitoringi
  | 'teacher_attendance'; // Ustoz: Davomat

interface SidebarProps {
  user: User;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
  schools?: School[];
  currentSchoolId?: string;
  onSchoolChange?: (schoolId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Sidebar({
  user,
  activeSection,
  onSelectSection,
  selectedDate,
  onDateChange,
  onRefresh,
  schools = [],
  currentSchoolId,
  isMobileOpen,
  onCloseMobile,
  darkMode,
  onToggleDarkMode,
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Har bir rolga xos bo'limlar ro'yxati
  let navItems: { id: NavSection; label: string; icon: string; subtitle?: string }[] = [];

  if (user.role === 'DIRECTOR' || user.role === 'DEPUTY_DIRECTOR') {
    navItems = [
      { id: 'director_summary', label: 'Kunlik Xulosa', icon: 'dashboard', subtitle: 'Maktab ko‘rsatkichlari' },
      { id: 'classes', label: 'Sinflar Jurnali', icon: 'meeting_room', subtitle: '28 ta sinf arxivi' },
      { id: 'attendance_reports', label: 'Davomat Tahlili', icon: 'analytics', subtitle: 'Hisobot & Eksport' },
      { id: 'staff', label: 'Maktab Xodimlari', icon: 'badge', subtitle: 'Pedagoglar & Loginlar' },
    ];
  } else if (user.role === 'INSPECTOR') {
    navItems = [
      { id: 'inspector_monitor', label: 'Tezkor Monitoring', icon: 'bar_chart', subtitle: 'Smena hisob-kitoblari' },
      { id: 'inspector_classes', label: 'Sinflar Yo‘qlamasi', icon: 'fact_check', subtitle: '28 ta sinf davomati' },
    ];
  } else if (user.role === 'TEACHER') {
    navItems = [
      { id: 'teacher_monitor', label: 'Sinf Monitoringi', icon: 'pie_chart', subtitle: `${user.assigned_class_name || '5-A'} statistikasi` },
      { id: 'teacher_attendance', label: 'Davomat Olish', icon: 'edit_calendar', subtitle: 'Bugungi jurnal ro‘yxati' },
    ];
  }

  const currentSchool = schools.find((s) => s.id === currentSchoolId);

  return (
    <>
      {/* Mobil orqa qora fon (Overlay) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Asosiy Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#0c121e] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Yuqori Qism: Logo & Maktab Tanlovi */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 ring-4 ring-blue-50 dark:ring-blue-950/40">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                    Maktabim
                  </h1>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 block">
                  Elektron Davomat Tizimi
                </span>
              </div>
            </div>

            {/* Mobil yopish tugmasi */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Maktab Ko'rsatkichi */}
          <div className="bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Muassasa
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5" title={currentSchool?.name || user.school_name || 'Urganch tuman 3-maktab'}>
                {currentSchool?.name || user.school_name || 'Urganch tuman 3-maktab'}
              </p>
            </div>
          </div>

          {/* Sana Tanlash va Yangilash */}
          <div className="bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 pl-1">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">
                calendar_today
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer tracking-tight"
              />
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Ma'lumotlarni yangilash"
                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 active:scale-90 transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* O'rta Qism: Rolga Mos Bo'limlar */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-3.5 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {user.role === 'DIRECTOR' || user.role === 'DEPUTY_DIRECTOR'
              ? 'Direktor Portali'
              : user.role === 'INSPECTOR'
              ? 'Davomatchi Portali'
              : 'Ustoz Jurnali'}
          </div>

          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-[13px] transition-all duration-150 group text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="truncate block leading-tight">{item.label}</span>
                    {item.subtitle && (
                      <span className={`text-[10px] font-medium block truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && (
                  <span className="material-symbols-outlined text-[18px] text-white/80 shrink-0">
                    chevron_right
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pastki Qism: Dark Mode, Profil & Chiqish */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">
                  {darkMode ? 'dark_mode' : 'light_mode'}
                </span>
              </div>
              <span>{darkMode ? 'Tungi rejim' : 'Kunduzgi rejim'}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider">
              {darkMode ? 'DARK' : 'LIGHT'}
            </span>
          </button>

          {/* Foydalanuvchi kartasi */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                {user.name}
              </p>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate block mt-0.5">
                {user.role === 'DIRECTOR'
                  ? 'Maktab Direktori'
                  : user.role === 'DEPUTY_DIRECTOR'
                  ? 'Zamdirektor'
                  : user.role === 'INSPECTOR'
                  ? 'Davomat Mas’uli'
                  : `Sinf Rahbari (${user.assigned_class_name || '5-A'})`}
              </span>
            </div>
          </div>

          {/* Chiqish tugmasi */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
