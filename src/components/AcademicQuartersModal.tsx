'use client';

import React, { useState, useEffect } from 'react';
import { AcademicQuarter } from '@/lib/types';

interface AcademicQuartersModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess?: () => void;
}

export function AcademicQuartersModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: AcademicQuartersModalProps) {
  const [quarters, setQuarters] = useState<AcademicQuarter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchQuarters = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/quarters?school_id=${schoolId || 'sch_1'}`);
        const data = await res.json();
        if (data.quarters && Array.isArray(data.quarters)) {
          setQuarters(data.quarters);
        }
      } catch (err) {
        console.error(err);
        setError('Choraklar maʼlumotini yuklashda xatolik');
      } finally {
        setLoading(false);
      }
    };
    fetchQuarters();
  }, [isOpen, schoolId]);

  const handleChange = (
    index: number,
    field: 'start_date' | 'end_date' | 'vacation_start' | 'vacation_end',
    value: string
  ) => {
    setQuarters((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/quarters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId || 'sch_1',
          quarters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Saqlashda xatolik yuz berdi');
        return;
      }

      setSuccessMsg('Choraklar va taʼtillar muvaffaqiyatli saqlandi!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError('Server bilan aloqa uzildi');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <span className="material-symbols-outlined text-[26px]">calendar_month</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                O‘quv Taqvimi: Choraklar va Taʼtillarni Sozlash
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Har bir chorakning o‘qish kunlari va taʼtillar oralig‘ini belgilang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Eslatma:</span>
            </div>
            <p className="leading-relaxed">
              • <strong>Yakshanbalar</strong> va <strong>davlat bayramlari</strong> tizim tomonidan avtomatik dam olish kuni deb hisoblanadi.
              <br />
              • Ushbu oynada o‘quv yilingizga muvofiq <strong>4 ta chorak</strong> va <strong>chorak yakunidagi taʼtil</strong> sanalarini moslab saqlang.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              Choraklar maʼlumotlari yuklanmoqda...
            </div>
          ) : (
            <form id="quarters-form" onSubmit={handleSave} className="space-y-4">
              {quarters.map((q, idx) => (
                <div
                  key={q.quarter_number}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        {q.quarter_number}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {q.name}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      O‘quv davri va taʼtil
                    </span>
                  </div>

                  {/* 1. O'qish davri */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                        Chorak boshlanishi *
                      </label>
                      <input
                        type="date"
                        required
                        value={q.start_date || ''}
                        onChange={(e) => handleChange(idx, 'start_date', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                        Chorak tugashi *
                      </label>
                      <input
                        type="date"
                        required
                        value={q.end_date || ''}
                        onChange={(e) => handleChange(idx, 'end_date', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 2. Ta'til davri */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">beach_access</span>
                        <span>Taʼtil boshlanishi</span>
                      </label>
                      <input
                        type="date"
                        value={q.vacation_start || ''}
                        onChange={(e) => handleChange(idx, 'vacation_start', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">beach_access</span>
                        <span>Taʼtil tugashi</span>
                      </label>
                      <input
                        type="date"
                        value={q.vacation_end || ''}
                        onChange={(e) => handleChange(idx, 'vacation_end', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            form="quarters-form"
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
