'use client';

import React, { useState, useEffect } from 'react';
import { User, Student, AttendanceStatus } from '@/lib/types';

interface TeacherViewProps {
  user: User;
  selectedDate: string;
  schoolId?: string;
}

export function TeacherView({ user, selectedDate, schoolId }: TeacherViewProps) {
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

  // Sinflarni yuklash
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
        const res = await fetch(`/api/classes?date=${selectedDate}${schoolParam}`);
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
  }, [selectedDate, schoolId]);

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
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#006C49] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-[#6CF8BB]/40">
          <span className="material-symbols-outlined text-[22px]">check_circle</span>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Yuqori Panel: Sinf rahbari ma'lumoti (Stitch Style) */}
      <div className="bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#6FFBBE]/30 flex items-center justify-center text-[#006C49]">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#131B2E]">
                {currentClassInfo?.name || user.assigned_class_name || '5-A'} sinfi jurnali
              </h1>
              <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#006C49] border border-[#A7F3D0] rounded-full text-[11px] font-bold">
                Sinf Rahbari
              </span>
            </div>
            <p className="text-[13px] text-[#434655] mt-0.5">
              Davomatni tekshiring, kelmagan o‘quvchilarga sabab biriktiring va ota-onalar bilan bog‘laning
            </p>
          </div>
        </div>

        {/* Sinflarni almashtirish (agar bir nechta bo'lsa) */}
        {classes.length > 1 && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[13px] font-semibold text-[#434655]">Sinf:</span>
            <select
              value={activeClassId}
              onChange={(e) => setActiveClassId(e.target.value)}
              className="bg-[#F2F3FF] border border-[#C4C5D7]/70 text-[#131B2E] text-[13px] font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-[#1D4ED8]"
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

      {/* Statistika ko'rsatkichlari kartochkasi (Stitch 4 Cards Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4.5 shadow-xs">
          <span className="text-[12px] font-bold text-[#006C49] uppercase tracking-wider">
            Kelganlar
          </span>
          <div className="text-3xl font-bold text-[#006C49] mt-1.5">
            {present} <span className="text-sm font-normal text-[#434655]">/ {total}</span>
          </div>
          <div className="text-[12px] text-[#006C49] mt-1 font-semibold">Davomat: {percent}%</div>
        </div>

        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4.5 shadow-xs">
          <span className="text-[12px] font-bold text-[#BE123C] uppercase tracking-wider">
            Sababsiz
          </span>
          <div className="text-3xl font-bold text-[#BE123C] mt-1.5">{unexcused}</div>
          <div className="text-[12px] text-[#BE123C] mt-1 font-semibold">Nazorat zarur</div>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4.5 shadow-xs">
          <span className="text-[12px] font-bold text-[#B45309] uppercase tracking-wider">
            Sababli (Spravka)
          </span>
          <div className="text-3xl font-bold text-[#B45309] mt-1.5">{excused}</div>
          <div className="text-[12px] text-[#B45309] mt-1 font-semibold">Asosli hujjat</div>
        </div>

        <div className="bg-[#F2F3FF] border border-[#EAEDFF] rounded-2xl p-4.5 shadow-xs">
          <span className="text-[12px] font-bold text-[#0037B0] uppercase tracking-wider">
            Kechikkanlar
          </span>
          <div className="text-3xl font-bold text-[#0037B0] mt-1.5">{late}</div>
          <div className="text-[12px] text-[#0037B0] mt-1 font-semibold">Darsga kechikkan</div>
        </div>
      </div>

      {/* O'quvchilar ro'yxati jadvali (Stitch Institutional Table) */}
      <div className="bg-white rounded-2xl border border-[#C4C5D7]/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#EAEDFF] flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#131B2E] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1D4ED8] text-[22px]">groups</span>
            <span>O‘quvchilar ro‘yxati va holati</span>
          </h2>
          <span className="text-[12px] text-[#434655] font-semibold bg-[#F2F3FF] px-2.5 py-1 rounded-full">
            Jami {students.length} nafar
          </span>
        </div>

        {/* Desktop Table ko'rinishi */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#F2F3FF]/70 text-[#434655] font-bold text-[12px] border-b border-[#EAEDFF]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">O‘quvchi F.I.Sh</th>
                <th className="py-3 px-4">Bugungi Holat</th>
                <th className="py-3 px-4">Sabab / Spravka</th>
                <th className="py-3 px-4">Ota-onasi va Telefon</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEDFF]">
              {students.map((st, idx) => (
                <tr key={st.student_id} className="hover:bg-[#F2F3FF]/40 transition-colors">
                  <td className="py-3.5 px-4 text-[#747686] font-bold">
                    {(idx + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#131B2E]">{st.student_name}</td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl gap-1">
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'PRESENT')}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                          st.status === 'PRESENT'
                            ? 'bg-[#10B981] text-white shadow-xs'
                            : 'text-[#475569] hover:text-[#131B2E]'
                        }`}
                      >
                        Bor
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'ABSENT_UNEXCUSED')}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                          st.status === 'ABSENT_UNEXCUSED'
                            ? 'bg-[#F43F5E] text-white shadow-xs'
                            : 'text-[#475569] hover:text-[#131B2E]'
                        }`}
                      >
                        Yo‘q
                      </button>
                      <button
                        onClick={() => handleQuickStatusChange(st.student_id, 'LATE')}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                          st.status === 'LATE'
                            ? 'bg-[#F59E0B] text-white shadow-xs'
                            : 'text-[#475569] hover:text-[#131B2E]'
                        }`}
                      >
                        Kech
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {st.reason ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold">
                          {st.reason}
                        </span>
                        {st.doctor_note_url && (
                          <span className="text-[11px] bg-[#ECFDF5] text-[#006C49] border border-[#A7F3D0] px-2 py-0.5 rounded-full font-bold">
                            Spravka bor
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#747686] text-[12px]">Belgilanmagan</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#131B2E]">
                      {st.parent_name || 'Kiritilmagan'}
                    </div>
                    <div className="text-[12px] text-[#434655]">{st.parent_phone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openReasonModal(st)}
                        className="px-3 py-1.5 text-[12px] font-semibold rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#0037B0] flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Sabab kiritish</span>
                      </button>
                      {st.parent_phone && (
                        <a
                          href={`tel:${st.parent_phone}`}
                          title="Telefon qilish"
                          className="p-1.5 rounded-xl bg-[#6FFBBE]/40 hover:bg-[#6FFBBE] text-[#002113] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">call</span>
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
        <div className="md:hidden divide-y divide-[#EAEDFF]">
          {students.map((st, idx) => (
            <div key={st.student_id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-[#747686] mr-1.5">
                    {(idx + 1).toString().padStart(2, '0')}.
                  </span>
                  <span className="font-bold text-[#131B2E] text-sm">{st.student_name}</span>
                  {st.reason && (
                    <div className="mt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold">
                        {st.reason}
                      </span>
                    </div>
                  )}
                </div>

                {st.parent_phone && (
                  <a
                    href={`tel:${st.parent_phone}`}
                    className="p-2 rounded-xl bg-[#6FFBBE]/40 text-[#002113]"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                )}
              </div>

              {/* Status Selector & Sabab kiritish */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl">
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'PRESENT')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      st.status === 'PRESENT'
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'text-[#475569]'
                    }`}
                  >
                    Bor
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'ABSENT_UNEXCUSED')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      st.status === 'ABSENT_UNEXCUSED'
                        ? 'bg-[#F43F5E] text-white shadow-xs'
                        : 'text-[#475569]'
                    }`}
                  >
                    Yo‘q
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange(st.student_id, 'LATE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      st.status === 'LATE'
                        ? 'bg-[#F59E0B] text-white shadow-xs'
                        : 'text-[#475569]'
                    }`}
                  >
                    Kech
                  </button>
                </div>

                <button
                  onClick={() => openReasonModal(st)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#F2F3FF] text-[#0037B0]"
                >
                  Sabab kiritish
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sabab va Spravka Kiritish Modali (Stitch Style) */}
      {selectedStudentForReason && (
        <div className="fixed inset-0 z-50 bg-[#131B2E]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#C4C5D7]/70">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#131B2E]">Sabab biriktirish</h3>
                <p className="text-xs text-[#434655]">{selectedStudentForReason.student_name}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForReason(null)}
                className="p-2 rounded-xl text-[#747686] hover:bg-[#F2F3FF]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#434655] uppercase mb-1.5">
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
                          ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#0037B0]'
                          : 'bg-[#F2F3FF] border-[#C4C5D7]/50 text-[#131B2E] hover:bg-[#EAEDFF]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shifokor spravkasi checkbox */}
              <div className="flex items-center justify-between bg-[#F2F3FF] p-3 rounded-2xl border border-[#C4C5D7]/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006C49] text-[20px]">
                    description
                  </span>
                  <span className="text-xs font-bold text-[#131B2E]">
                    Tibbiy spravka tasdiqlangan
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasDoctorNote}
                  onChange={(e) => setHasDoctorNote(e.target.checked)}
                  className="w-5 h-5 accent-[#1D4ED8] rounded cursor-pointer"
                />
              </div>

              {/* Qo'shimcha izoh */}
              <div>
                <label className="block text-xs font-bold text-[#434655] uppercase mb-1">
                  Qo‘shimcha izoh
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Masalan: Ota-onasi telefon orqali ma'lum qildi..."
                  rows={2}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#C4C5D7]/70 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForReason(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#C4C5D7] text-[#434655] font-bold text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveReason}
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0037B0] text-white font-bold text-xs shadow-md shadow-[#1D4ED8]/20"
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
