'use client';

import React, { useState, useEffect } from 'react';
import { User, Student, AttendanceStatus } from '@/lib/types';
import { 
  Users, CheckCircle2, Phone, MessageSquare, AlertCircle, 
  FileText, Check, Clock, Save, Edit3, X, ExternalLink
} from 'lucide-react';

interface TeacherViewProps {
  user: User;
  selectedDate: string;
}

export function TeacherView({ user, selectedDate }: TeacherViewProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>(user.assigned_class_id || 'cls_5a');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sabab tahrirlash modali uchun state
  const [selectedStudentForReason, setSelectedStudentForReason] = useState<any | null>(null);
  const [reasonType, setReasonType] = useState<string>('Kasallik (spravka bor)');
  const [customNote, setCustomNote] = useState<string>('');
  const [hasDoctorNote, setHasDoctorNote] = useState<boolean>(true);

  // Sinflarni yuklash (agar o'qituvchiga bir nechta sinf bo'lsa yoki tanlash uchun)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(`/api/classes?date=${selectedDate}`);
        const data = await res.json();
        if (data.classes) {
          setClasses(data.classes);
          if (!activeClassId && data.classes.length > 0) {
            setActiveClassId(data.classes[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, [selectedDate]);

  // Sinf davomatini yuklash
  const loadClassAttendance = async () => {
    if (!activeClassId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?class_id=${activeClassId}&date=${selectedDate}`);
      const data = await res.json();
      if (data.records) {
        setStudents(data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassAttendance();
  }, [activeClassId, selectedDate]);

  // Holatni o'zgartirish
  const handleQuickStatusChange = async (studentId: string, status: AttendanceStatus) => {
    const updated = students.map((s) => (s.student_id === studentId ? { ...s, status } : s));
    setStudents(updated);

    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClassId,
          date: selectedDate,
          records: [{ student_id: studentId, status }],
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Sabab modalini ochish
  const openReasonModal = (student: any) => {
    setSelectedStudentForReason(student);
    setReasonType(student.reason || 'Kasallik (spravka bor)');
    setCustomNote(student.notes || '');
    setHasDoctorNote(!!student.doctor_note_url);
  };

  // Sababni saqlash
  const handleSaveReason = async () => {
    if (!selectedStudentForReason) return;
    setSaving(true);
    try {
      const updatedStatus: AttendanceStatus = hasDoctorNote ? 'ABSENT_EXCUSED' : 'ABSENT_UNEXCUSED';

      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClassId,
          date: selectedDate,
          records: [
            {
              student_id: selectedStudentForReason.student_id,
              status: updatedStatus,
              reason: reasonType,
              notes: customNote,
              doctor_note_url: hasDoctorNote ? 'spravka_tasdiqlangan' : null,
            },
          ],
        }),
      });

      setToast(`${selectedStudentForReason.student_name} uchun sabab biriktirildi`);
      setTimeout(() => setToast(null), 3000);
      setSelectedStudentForReason(null);
      loadClassAttendance();
    } catch (err) {
      console.error(err);
      alert('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  // Hisob-kitoblar
  const total = students.length;
  const present = students.filter((s) => s.status === 'PRESENT').length;
  const unexcused = students.filter((s) => s.status === 'ABSENT_UNEXCUSED').length;
  const excused = students.filter((s) => s.status === 'ABSENT_EXCUSED').length;
  const late = students.filter((s) => s.status === 'LATE').length;
  const percent = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const currentClassInfo = classes.find((c) => c.id === activeClassId);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Yuqori Panel: Sinf rahbari ma'lumoti */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              👩‍🏫 {currentClassInfo?.name || user.assigned_class_name || '5-A'} sinfi jurnali
            </h1>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">
              Sinf Rahbari
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Davomatni tekshiring, kelmagan o‘quvchilarga sabab biriktiring va ota-onalar bilan bog‘laning
          </p>
        </div>

        {/* Sinflarni almashtirish (agar bir nechta bo'lsa) */}
        {classes.length > 1 && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-slate-500">Sinf:</span>
            <select
              value={activeClassId}
              onChange={(e) => setActiveClassId(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl px-3 py-2 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.shift}-smena)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Statistika ko'rsatkichlari kartochkasi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Kelganlar</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {present} <span className="text-xs font-normal text-emerald-700">/ {total}</span>
          </div>
          <div className="text-xs text-emerald-600 mt-0.5 font-semibold">Davomat: {percent}%</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Sababsiz kelmagan</span>
          <div className="text-2xl font-black text-red-900 mt-1">{unexcused}</div>
          <div className="text-xs text-red-600 mt-0.5">Nazorat talab qilinadi</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sababli (Spravka)</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{excused}</div>
          <div className="text-xs text-amber-600 mt-0.5">Asosli hujjat bilan</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Kechikkanlar</span>
          <div className="text-2xl font-black text-blue-900 mt-1">{late}</div>
          <div className="text-xs text-blue-600 mt-0.5">Darsga kechikib kirdi</div>
        </div>
      </div>

      {/* O'quvchilar ro'yxati jadvali / kartochkasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <span>O‘quvchilar ro‘yxati va holati</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Jami {students.length} nafar</span>
        </div>

        {/* Desktop Table ko'rinishi */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">O‘quvchi F.I.Sh</th>
                <th className="py-3 px-4">Bugungi Holat</th>
                <th className="py-3 px-4">Sabab / Spravka</th>
                <th className="py-3 px-4">Ota-onasi va Telefon</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {students.map((st, idx) => (
                <tr key={st.student_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{st.student_name}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'PRESENT')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          st.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✓ Bor
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'ABSENT_UNEXCUSED')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          st.status === 'ABSENT_UNEXCUSED'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✕ Yo‘q
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'LATE')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          st.status === 'LATE'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ⏱ Kech
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {st.reason ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                          {st.reason}
                        </span>
                        {st.doctor_note_url && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                            Spravka bor
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Belgilanmagan</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-semibold text-slate-800">{st.parent_name || 'Kiritilmagan'}</div>
                    <div className="text-xs text-slate-500">{st.parent_phone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openReasonModal(st)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sabab kiritish</span>
                      </button>
                      {st.parent_phone && (
                        <a
                          href={`tel:${st.parent_phone}`}
                          title="Telefon qilish"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards ko'rinishi */}
        <div className="md:hidden divide-y divide-slate-100">
          {students.map((st, idx) => (
            <div key={st.student_id} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 mr-1.5">{idx + 1}.</span>
                  <span className="font-bold text-slate-900 text-sm">{st.student_name}</span>
                  {st.reason && (
                    <div className="mt-0.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                        {st.reason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Telefon & Telegram */}
                {st.parent_phone && (
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${st.parent_phone}`}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Status Selector & Sabab kiritish */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'PRESENT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      st.status === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Bor
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'ABSENT_UNEXCUSED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      st.status === 'ABSENT_UNEXCUSED'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Yo‘q
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'LATE')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                      st.status === 'LATE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Kech
                  </button>
                </div>

                <button
                  onClick={() => openReasonModal(st)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Sabab kiritish
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sabab va Spravka Kiritish Modali */}
      {selectedStudentForReason && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sabab biriktirish</h3>
                <p className="text-xs text-slate-500">{selectedStudentForReason.student_name}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForReason(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Sabab turi
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Kasallik (spravka bor)',
                    'Oilaviy sabab',
                    'Shahar/Respublika olimpiadasi',
                    'Sport musobaqasi',
                    'Sababsiz (dars qoldirish)',
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setReasonType(item);
                        if (item.includes('spravka')) setHasDoctorNote(true);
                        else if (item.includes('Sababsiz')) setHasDoctorNote(false);
                      }}
                      className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-left transition-all border ${
                        reasonType === item
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shifokor spravkasi switch */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Tibbiy spravka tasdiqlangan</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasDoctorNote}
                  onChange={(e) => setHasDoctorNote(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Qo'shimcha izoh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Qo‘shimcha izoh
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Masalan: Ota-onasi telefon orqali ma'lum qildi..."
                  rows={2}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForReason(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveReason}
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
