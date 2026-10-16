'use client';

import React, { useState, useEffect } from 'react';

export interface EditableStudent {
  id: string;
  name: string;
  class_id?: string;
  class_name?: string;
  gender?: string;
  parent_name?: string | null;
  parent_phone?: string | null;
  birth_date?: string | null;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deleted?: boolean) => void;
  student: EditableStudent | null;
  classes: Array<{ id: string; name: string }>;
}

export function EditStudentModal({
  isOpen,
  onClose,
  onSuccess,
  student,
  classes,
}: EditStudentModalProps) {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+998');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setClassId(student.class_id || (classes.length > 0 ? classes[0].id : ''));
      setGender((student.gender as 'male' | 'female') || 'male');
      setParentName(student.parent_name || '');
      setParentPhone(student.parent_phone || '+998');
      setError(null);
    }
  }, [student, classes]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O‘quvchi ism va familiyasini kiriting');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          name: name.trim(),
          class_id: classId || undefined,
          gender,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'O‘quvchini tahrirlashda xatolik yuz berdi');
        setSaving(false);
        return;
      }

      onSuccess(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Server bilan aloqa uzildi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Haqiqatan ham "${student.name}" o‘quvchisini va uning barcha davomat ma’lumotlarini o‘chirmoqchimisiz?`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/students?id=${student.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'O‘quvchini o‘chirishda xatolik yuz berdi');
        setDeleting(false);
        return;
      }

      onSuccess(true);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Server bilan aloqa uzildi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">edit</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                O‘quvchi Ma’lumotlarini Tahrirlash
              </h3>
              <p className="text-xs text-slate-400">
                O‘quvchini tahrirlash yoki sinfdan o‘chirish
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
          {/* Sinf tanlash */}
          {classes.length > 0 && (
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Sinfi
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} sinfi
                  </option>
                ))}
              </select>
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
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Tugmalar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={deleting || saving}
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>{deleting ? 'O‘chirilmoqda...' : 'O‘quvchini o‘chirish'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Saqlash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
