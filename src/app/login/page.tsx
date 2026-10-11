'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const loginUser = customUser || username;
    const loginPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kirishda xatolik yuz berdi');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError('Server bilan bog‘lanishda xatolik');
      setLoading(false);
    }
  };

  const handleQuickDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(undefined, u, p);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4 sm:p-6 font-sans transition-colors">
      <div className="max-w-md w-full space-y-6">
        {/* Logo va Sarlavha (Stitch Modern EdTech) */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-600/30 ring-4 ring-blue-50 dark:ring-blue-950/40">
            <span className="material-symbols-outlined text-[34px]">school</span>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Maktabim
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                PRO
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Urganch tuman 3-maktab elektron davomat tizimi
            </p>
          </div>
        </div>

        {/* Kirish formasi */}
        <div className="bg-white dark:bg-[#0c121e] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Login
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  required
                  placeholder="direktor, ustoz yoki davomatchi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 font-bold text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Parol
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                  lock
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 font-bold text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Tezkor Demo Rollari */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-amber-500 text-[16px]">bolt</span>
                1 bosishda kirish
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Demo hisoblar</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('direktor', 'direktor123')}
                className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 border border-blue-200/80 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 font-extrabold text-left transition-all active:scale-95 shadow-2xs"
              >
                <div>🎓 Direktor</div>
                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium">Boshqaruv & Tahlil</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('davomatchi', 'davomat123')}
                className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 font-extrabold text-left transition-all active:scale-95 shadow-2xs"
              >
                <div>📱 Davomatchi</div>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">28 sinf yo‘qlamasi</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('ustoz', 'ustoz123')}
                className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-left transition-all active:scale-95 shadow-2xs"
              >
                <div>👩‍🏫 Sinf Rahbari</div>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">5-A sinf jurnali</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('zamdirektor', 'zam123')}
                className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100/80 border border-purple-200/80 dark:border-purple-900/60 text-purple-800 dark:text-purple-300 font-extrabold text-left transition-all active:scale-95 shadow-2xs"
              >
                <div>📋 Zamdirektor</div>
                <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80 font-medium">Nazorat & Hisobot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 font-medium">
          Google Stitch EdTech Design Tizimi • Urganch tuman 3-maktab
        </p>
      </div>
    </div>
  );
}
