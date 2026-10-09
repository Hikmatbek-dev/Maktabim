'use client';

import React, { useState, useEffect } from 'react';
import { SchoolClass, Student, AttendanceStatus } from '@/lib/types';

interface InspectorViewProps {
  selectedDate: string;
  schoolId?: string;
}

export function InspectorView({ selectedDate, schoolId }: InspectorViewProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<1 | 2>(1);
  const [activeClass, setActiveClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; reason?: string }>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchStudent, setSearchStudent] = useState('');

  // Sinflarni yuklash
  const loadClasses = async () => {
    try {
      setLoading(true);
      const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
      const res = await fetch(`/api/classes?date=${selectedDate}&shift=${selectedShift}${schoolParam}`);
      const data = await res.json();
      if (data.classes) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
    if (activeClass) {
      loadClassAttendance(activeClass.id);
    }
  }, [selectedDate, selectedShift, schoolId]);

  // Tanlangan sinf o'quvchilari va davomatini yuklash
  const loadClassAttendance = async (classId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?class_id=${classId}&date=${selectedDate}`);
      const data = await res.json();

      if (data.records) {
        const map: Record<string, { status: AttendanceStatus; reason?: string }> = {};
        const stList: Student[] = [];

        data.records.forEach((r: any) => {
          map[r.student_id] = {
            status: r.status as AttendanceStatus,
            reason: r.reason,
          };
          stList.push({
            id: r.student_id,
            school_id: schoolId || 'sch_1',
            class_id: classId,
            name: r.student_name,
            gender: r.gender,
            parent_name: r.parent_name,
            parent_phone: r.parent_phone,
            status: 'active',
          });
        });

        setStudents(stList);
        setAttendanceMap(map);
        setIsSubmitted(!!data.submission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (cls: SchoolClass) => {
    setActiveClass(cls);
    loadClassAttendance(cls.id);
  };

  // Bir tegishda almashtirish (Bor <-> Yo'q)
  const handleToggleStatus = (studentId: string) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId]?.status || 'PRESENT';
      const nextStatus: AttendanceStatus = current === 'PRESENT' ? 'ABSENT_UNEXCUSED' : 'PRESENT';
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: nextStatus,
        },
      };
    });
  };

  // Holatni to'g'ridan-to'g'ri o'rnatish
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Barchasini "Bor" deb belgilash
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; reason?: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'PRESENT' };
    });
    setAttendanceMap(updated);
  };

  // Davomatni saqlash va topshirish
  const handleSaveAndSubmit = async () => {
    if (!activeClass) return;
    setSaving(true);
    try {
      const records = Object.entries(attendanceMap).map(([studentId, data]) => ({
        student_id: studentId,
        status: data.status,
        reason: data.reason || null,
      }));

      // 1. Saqlash
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClass.id,
          date: selectedDate,
          records,
        }),
      });

      // 2. Topshirish
      await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClass.id,
          date: selectedDate,
        }),
      });

      setIsSubmitted(true);
      setSuccessToast(`${activeClass.name} sinfi davomati muvaffaqiyatli topshirildi!`);
      setTimeout(() => setSuccessToast(null), 3500);
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  // Hisob-kitoblar
  const total = students.length;
  const present = Object.values(attendanceMap).filter((s) => s.status === 'PRESENT').length;
  const absent = Object.values(attendanceMap).filter((s) => s.status === 'ABSENT_UNEXCUSED').length;
  const late = Object.values(attendanceMap).filter((s) => s.status === 'LATE').length;

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-32 space-y-6">
      {/* Toast xabari */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#006C49] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 border border-[#6CF8BB]/40">
          <span className="material-symbols-outlined text-[22px]">check_circle</span>
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* SINF TANLANMAGAN BO'LSA - BARCHA SINFLAR */}
      {!activeClass ? (
        <div className="space-y-5">
          {/* Sarlavha & Smena segmenti */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1D4ED8] text-[26px]">checklist</span>
                <h1 className="text-lg sm:text-xl font-bold text-[#131B2E]">
                  Tezkor Davomat Tekshiruvi
                </h1>
                <span className="px-2.5 py-0.5 bg-[#EAEDFF] text-[#0037B0] font-semibold text-xs rounded-full">
                  Mobil / Inspector
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#434655] mt-1">
                Sinfni tanlang va har bir o‘quvchiga 1 marta bosish orqali davomatni belgilang
              </p>
            </div>

            {/* Smena Segmented Control */}
            <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-[#C4C5D7]/50 self-start sm:self-auto">
              <button
                onClick={() => setSelectedShift(1)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedShift === 1
                    ? 'bg-white text-[#0037B0] font-bold shadow-xs'
                    : 'text-[#434655] hover:text-[#131B2E]'
                }`}
              >
                1-Smena (Ertalab)
              </button>
              <button
                onClick={() => setSelectedShift(2)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedShift === 2
                    ? 'bg-white text-[#0037B0] font-bold shadow-xs'
                    : 'text-[#434655] hover:text-[#131B2E]'
                }`}
              >
                2-Smena (Tushdan keyin)
              </button>
            </div>
          </div>

          {/* Sinflar ro'yxati kartochkalari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classes.map((cls) => {
              const isDone = cls.is_submitted;
              return (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer tap-active relative overflow-hidden group hover:shadow-md ${
                    isDone
                      ? 'border-[#A7F3D0] hover:border-[#10B981]'
                      : 'border-[#C4C5D7]/60 hover:border-[#1D4ED8]'
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isDone ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                    }`}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F2F3FF] group-hover:bg-[#EAEDFF] text-[#0037B0] flex items-center justify-center font-bold text-lg transition-colors">
                        {cls.name}
                      </div>
                      <div>
                        <span className="text-xs text-[#434655] font-medium block">
                          {cls.room || 'Xona ko‘rsatilmagan'}
                        </span>
                        <div className="text-xs font-semibold text-[#131B2E]">
                          {cls.teacher_name || 'Ustoz biriktirilmagan'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Topshirilgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] bg-[#FFFBEB] px-2.5 py-1 rounded-full border border-[#FDE68A]">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Kutilmoqda
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#EAEDFF] text-xs">
                    <div className="flex items-center gap-1.5 text-[#434655] font-medium">
                      <span className="material-symbols-outlined text-[16px] text-[#747686]">groups</span>
                      <span>{cls.total_students} o‘quvchi</span>
                    </div>

                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-[#047857]">✓ {cls.present_count}</span>
                      <span className="text-[#BE123C]">✕ {cls.unexcused_count}</span>
                      {cls.excused_count > 0 && <span className="text-[#B45309]">⚠ {cls.excused_count}</span>}
                      <span className="text-[#747686]">({cls.percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SINF TANLANGAN BO'LSA — 1:1 GOOGLE STITCH MOBIL DIZAYNI */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* TopAppBar Navigation */}
          <div className="bg-white rounded-2xl border border-[#C4C5D7]/60 p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveClass(null)}
                className="p-2 rounded-xl text-[#0037B0] hover:bg-[#EAEDFF] active:scale-95 transition-transform"
                title="Orqaga"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-[17px] font-bold text-[#0037B0] leading-tight">
                  {activeClass.name} sinfi {activeClass.room ? `(${activeClass.room})` : ''}
                </h1>
                <p className="text-[13px] text-[#434655]">
                  {selectedDate} | {activeClass.teacher_name || 'Ustoz belgilanmagan'}
                </p>
              </div>
            </div>

            {/* Sinfni tezkor o'zgartirish select */}
            <div className="flex items-center gap-2">
              <select
                value={activeClass.id}
                onChange={(e) => {
                  const target = classes.find((c) => c.id === e.target.value);
                  if (target) handleSelectClass(target);
                }}
                className="bg-[#F2F3FF] text-[#131B2E] text-[12px] font-semibold rounded-xl px-3 py-1.5 border border-[#C4C5D7]/70 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stitch: Inspection Summary Cards (4 ta rangli metrika kartasi) */}
          <div className="bg-white rounded-2xl border border-[#C4C5D7]/60 p-4 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[14px] font-bold text-[#131B2E]">Umumiy ko‘rsatkichlar</span>
              <button
                onClick={handleMarkAllPresent}
                className="text-[12px] font-semibold text-[#047857] hover:underline flex items-center gap-1 bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                Hammasi kelgan
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#F2F3FF] p-3 rounded-xl border border-[#EAEDFF]">
                <div className="text-[20px] font-bold text-[#0037B0]">{total}</div>
                <div className="text-[11px] font-bold text-[#434655] mt-1">Jami</div>
              </div>

              <div className="bg-[#ECFDF5] p-3 rounded-xl border border-[#A7F3D0]">
                <div className="text-[20px] font-bold text-[#047857]">{present}</div>
                <div className="text-[11px] font-bold text-[#047857] mt-1">Kelgan</div>
              </div>

              <div className="bg-[#FFF1F2] p-3 rounded-xl border border-[#FECDD3]">
                <div className="text-[20px] font-bold text-[#BE123C]">{absent}</div>
                <div className="text-[11px] font-bold text-[#BE123C] mt-1">Kelmagan</div>
              </div>

              <div className="bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A]">
                <div className="text-[20px] font-bold text-[#B45309]">{late}</div>
                <div className="text-[11px] font-bold text-[#B45309] mt-1">Kechikkan</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#747686] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="O'quvchi F.I.Sh bo‘yicha qidirish..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-[#C4C5D7]/70 rounded-xl text-sm text-[#131B2E] placeholder-[#747686] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-all outline-none"
            />
          </div>

          {/* Student Inspection Cards List (Stitch 1:1 Kartochkalari) */}
          <div className="space-y-3">
            {filteredStudents.map((student, idx) => {
              const currentStatus = attendanceMap[student.id]?.status || 'PRESENT';
              const isPresent = currentStatus === 'PRESENT';
              const isAbsent = currentStatus === 'ABSENT_UNEXCUSED';
              const isLate = currentStatus === 'LATE';

              const indexStr = (idx + 1).toString().padStart(2, '0');

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl border border-[#C4C5D7]/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#747686] transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EAEDFF] text-[#0037B0] font-bold flex items-center justify-center text-sm shrink-0">
                      {indexStr}
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold text-[#131B2E] leading-snug">
                        {student.name}
                      </h2>
                      <p className="text-[12px] text-[#434655]">
                        ID: #{activeClass.name}-{indexStr}
                        {student.parent_phone && ` • ${student.parent_phone}`}
                      </p>
                    </div>
                  </div>

                  {/* Segmented 3-talik tugmalar guruhi */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto bg-[#F1F5F9] p-1.5 rounded-xl self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'PRESENT')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                        isPresent
                          ? 'bg-[#10B981] text-white shadow-sm'
                          : 'text-[#475569] hover:text-[#131B2E]'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'ABSENT_UNEXCUSED')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                        isAbsent
                          ? 'bg-[#F43F5E] text-white shadow-sm'
                          : 'text-[#475569] hover:text-[#131B2E]'
                      }`}
                    >
                      Yo‘q
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'LATE')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                        isLate
                          ? 'bg-[#F59E0B] text-white shadow-sm'
                          : 'text-[#475569] hover:text-[#131B2E]'
                      }`}
                    >
                      Kechikkan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Execution Tray (Pastki yopishqoq panel - Stitch 1:1) */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#C4C5D7]/70 p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] z-50">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <p className="text-[14px] font-bold text-[#131B2E]">
                  {activeClass.name} sinfi davomati
                </p>
                <p className="text-[12px] text-[#434655]">
                  {total} ta o‘quvchidan {present} tasi darsda, {absent} tasi kelmagan
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setActiveClass(null)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 rounded-xl border border-[#C4C5D7] text-[#434655] font-semibold text-sm hover:bg-[#F2F3FF]"
                >
                  Orqaga
                </button>
                <button
                  onClick={handleSaveAndSubmit}
                  disabled={saving}
                  className="w-2/3 sm:w-auto flex-1 sm:flex-none min-h-[48px] px-6 bg-[#1D4ED8] hover:bg-[#0037B0] text-white text-[14px] font-bold rounded-xl shadow-md active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>{saving ? 'Saqlanmoqda...' : 'Davomatni tasdiqlash va yuborish'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
