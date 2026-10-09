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
    <div className="min-h-screen bg-[#FAF8FF] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Logo va Sarlavha (Stitch Modern EdTech) */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white mx-auto shadow-md">
            <span className="material-symbols-outlined text-[36px]">school</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0037B0] tracking-tight">
              Maktabim EdTech
            </h1>
            <p className="text-[13px] text-[#434655] mt-1">
              Elektron maktab davomati va monitoring tizimi
            </p>
          </div>
        </div>

        {/* Kirish formasi */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#C4C5D7]/70">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#434655] uppercase mb-1.5">
                Login
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#747686] text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  required
                  placeholder="admin, ustoz yoki davomatchi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-[14px] rounded-xl border border-[#C4C5D7]/80 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 font-medium text-[#131B2E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#434655] uppercase mb-1.5">
                Parol
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#747686] text-[20px]">
                  lock
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-[14px] rounded-xl border border-[#C4C5D7]/80 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 font-medium text-[#131B2E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#0037B0] text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Tezkor Demo Rollari */}
          <div className="mt-6 pt-5 border-t border-[#EAEDFF]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#747686] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[#F59E0B] text-[16px]">bolt</span>
                1 bosishda kirish
              </span>
              <span className="text-[11px] text-[#747686]">Demo rejim</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('davomatchi', 'davomat123')}
                className="p-2.5 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] font-bold text-left transition-all"
              >
                <div>📱 Davomatchi</div>
                <span className="text-[10px] text-[#B45309]/80 font-normal">Tezkor mobil</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('ustoz', 'ustoz123')}
                className="p-2.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] text-[#047857] font-bold text-left transition-all"
              >
                <div>👩‍🏫 Sinf Rahbari</div>
                <span className="text-[10px] text-[#047857]/80 font-normal">5-A jurnali</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('direktor', 'direktor123')}
                className="p-2.5 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] border border-[#DCE1FF] text-[#0037B0] font-bold text-left transition-all"
              >
                <div>🎓 Direktor</div>
                <span className="text-[10px] text-[#0037B0]/80 font-normal">Desktop tahlil</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('zamdirektor', 'zam123')}
                className="p-2.5 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] border border-[#DCE1FF] text-[#0037B0] font-bold text-left transition-all"
              >
                <div>📋 Zamdirektor</div>
                <span className="text-[10px] text-[#0037B0]/80 font-normal">Hisobotlar</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'admin123')}
                className="col-span-2 p-2.5 rounded-xl bg-[#FAF8FF] hover:bg-[#EAEDFF] border border-[#C4C5D7] text-[#131B2E] font-bold text-center transition-all"
              >
                🛡️ Super Admin (Barcha maktablar boshqaruvi)
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#747686]">
          Google Stitch EdTech Design Tizimi asosida • 2026
        </p>
      </div>
    </div>
  );
}
