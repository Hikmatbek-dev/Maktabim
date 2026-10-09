'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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

      // Muvaffaqiyatli kirish
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Logo va Sarlavha */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
            <span className="font-black text-3xl">M</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Maktabim Davomat
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Yagona elektron maktab davomat monitoring platformasi
          </p>
        </div>

        {/* Kirish formasi */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="admin, ustoz yoki davomatchi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>{loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Tezkor Demo Kirish Rollari */}
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Tezkor sinov rollari
              </span>
              <span className="text-[10px] text-slate-400">1 bosishda kirish</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('davomatchi', 'davomat123')}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-left transition-all"
              >
                <div>📱 Davomatchi</div>
                <span className="text-[10px] text-amber-700 font-normal">Tezkor ro‘yxat</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('ustoz', 'ustoz123')}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-left transition-all"
              >
                <div>👩‍🏫 Sinf Rahbari</div>
                <span className="text-[10px] text-emerald-700 font-normal">5-A sinf jurnali</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('direktor', 'direktor123')}
                className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-left transition-all"
              >
                <div>🎓 Direktor</div>
                <span className="text-[10px] text-blue-700 font-normal">Maktab tahlili</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('zamdirektor', 'zam123')}
                className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-left transition-all"
              >
                <div>📋 Zamdirektor</div>
                <span className="text-[10px] text-indigo-700 font-normal">Hisobot & Excel</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'admin123')}
                className="col-span-2 p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-center transition-all"
              >
                🛡️ Super Admin (Barcha sozlamalar va baza)
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          Mobil va kompyuter uchun to‘liq moslashtirilgan • 2026
        </p>
      </div>
    </div>
  );
}
