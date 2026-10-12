'use client';

import React, { useState } from 'react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: Array<{ id: string; name: string }>;
  defaultClassId?: string;
  schoolId?: string;
}

export function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
  classes,
  defaultClassId,
  schoolId,
}: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(defaultClassId || (classes[0]?.id ?? ''));
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+998');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync defaultClassId if changed
  React.useEffect(() => {
    if (defaultClassId) {
      setClassId(defaultClassId);
    } else if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [defaultClassId, classes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O‘quvchi ism va familiyasini kiriting');
      return;
    }

    const targetClassId = classId || defaultClassId || classes[0]?.id;
    if (!targetClassId) {
      setError('Sinf tanlanishi shart');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          class_id: targetClassId,
          gender,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          school_id: schoolId || 'sch_1',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'O‘quvchi qo‘shishda xatolik yuz berdi');
        setSaving(false);
        return;
      }

      setName('');
      setParentName('');
      setParentPhone('+998');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Server bilan aloqa uzildi');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassName = classes.find((c) => c.id === (classId || defaultClassId))?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">person_add</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Sinfga Yangi O‘quvchi Qo‘shish
              </h3>
              <p className="text-xs text-slate-400">
                {selectedClassName ? `${selectedClassName} sinfi uchun yangi o‘quvchi ma’lumotlari` : 'Yangi o‘quvchi ma’lumotlari'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Sinf tanlash (agar 1 tadan ko'p bo'lsa yoki defaultClassId berilmagan bo'lsa) */}
          {classes.length > 1 ? (
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Sinf *
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} sinfi
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Sinf:</span>
              <span className="text-blue-600 dark:text-blue-400 font-black">{classes[0]?.name || 'Tanlangan sinf'}</span>
            </div>
          )}

          {/* O'quvchi F.I.Sh */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              O‘quvchi F.I.Sh (Familiya, Ism) *
            </label>
            <input
              type="text"
              required
              placeholder="Masalan: Olimov Jasur Anvar o‘g‘li"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          {/* Jinsi */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Jinsi *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  gender === 'male'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-400 ring-2 ring-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">male</span>
                <span>O‘g‘il bola</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  gender === 'female'
                    ? 'bg-pink-50 dark:bg-pink-950/60 border-pink-600 text-pink-700 dark:text-pink-400 ring-2 ring-pink-600/20'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">female</span>
                <span>Qiz bola</span>
              </button>
            </div>
          </div>

          {/* Ota-ona ma'lumotlari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Ota-onasi F.I.Sh
              </label>
              <input
                type="text"
                placeholder="Masalan: Olimov Anvar"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Telefon Raqami
              </label>
              <input
                type="text"
                placeholder="+998901234567"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Tugmalar */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Qo‘shilmoqda...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>O‘quvchini Qo‘shish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
