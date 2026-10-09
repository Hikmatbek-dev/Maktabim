'use client';

import React, { useState } from 'react';
import { User, Role } from '@/lib/types';
import { RoleBadge } from './RoleBadge';
import { LogOut, Calendar, RefreshCw, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  user: User;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
}

export function Navbar({ user, selectedDate, onDateChange, onRefresh }: NavbarProps) {
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
          password: username === 'admin' ? 'admin123' : username === 'direktor' ? 'direktor123' : username === 'zamdirektor' ? 'zam123' : username === 'davomatchi' ? 'davomat123' : 'ustoz123'
        }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Maktab nomi */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <span className="font-black text-xl tracking-tight">M</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                  Maktabim
                </span>
                <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Davomatni monitoring qilish platformasi
              </p>
            </div>
          </div>

          {/* O'rta qism: Sana tanlagich & Yangilash */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100/90 rounded-lg p-1 text-xs border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-1.5 mr-1" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-slate-800 font-medium py-1 px-1.5 focus:outline-none cursor-pointer"
              />
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Ma'lumotlarni yangilash"
                className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* O'ng qism: Foydalanuvchi ma'lumotlari & Chiqish */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {user.name}
              </span>
              <RoleBadge role={user.role} className="mt-0.5" />
            </div>

            {/* Tezkor Rol almashtirish tugmasi (Test uchun juda qulay) */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                title="Rolni almashtirish (Test rejimi)"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Rolni almashtirish</span>
              </button>

              {showSwitchMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tezkor sinov rollari
                  </div>
                  <button
                    onClick={() => handleQuickSwitch('davomatchi')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>📱 Davomatchi</span>
                    <span className="text-slate-400 text-[10px]">davomatchi</span>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('ustoz')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>👩‍🏫 Sinf rahbari (5-A)</span>
                    <span className="text-slate-400 text-[10px]">ustoz</span>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('direktor')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>🎓 Direktor</span>
                    <span className="text-slate-400 text-[10px]">direktor</span>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('zamdirektor')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>📋 Zamdirektor</span>
                    <span className="text-slate-400 text-[10px]">zamdirektor</span>
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('admin')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>🛡️ Super Admin</span>
                    <span className="text-slate-400 text-[10px]">admin</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chiqish tugmasi */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Tizimdan chiqish"
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
