'use client';

import React, { useState, useEffect } from 'react';
import { SchoolClass, Student, AttendanceStatus } from '@/lib/types';
import { StudentMonthlyModal } from '../StudentMonthlyModal';
import { AddStudentModal } from '../AddStudentModal';

interface InspectorViewProps {
  selectedDate: string;
  schoolId?: string;
  activeTab?: 'inspector_monitor' | 'inspector_classes';
}

export function InspectorView({ selectedDate, schoolId, activeTab = 'inspector_classes' }: InspectorViewProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<1 | 2>(1);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; reason?: string }>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE'>('ALL');
  const [studentsLoading, setStudentsLoading] = useState(false);

  // O'quvchi qo'shish modali
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  // O'quvchi ustiga bosilganda oylik taqvim modali
  const [selectedStudentForMonthly, setSelectedStudentForMonthly] = useState<any | null>(null);

  // Sinflarni yuklash
  const loadClasses = async () => {
    try {
      setLoading(true);
      const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
      const res = await fetch(`/api/classes?date=${selectedDate}&shift=${selectedShift}${schoolParam}`);
      const data = await res.json();
      if (data.classes && data.classes.length > 0) {
        setClasses(data.classes);
        setActiveClassId((prev) => {
          if (prev && data.classes.some((c: any) => c.id === prev)) {
            return prev;
          }
          return data.classes[0].id;
        });
      } else {
        setClasses([]);
        setActiveClassId('');
        setStudents([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [selectedDate, selectedShift, schoolId]);

  // Tanlangan sinf davomatini yuklash
  const loadClassAttendance = async (classId: string) => {
    if (!classId) {
      setStudents([]);
      setAttendanceMap({});
      return;
    }
    try {
      setStudentsLoading(true);
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
      } else {
        setStudents([]);
        setAttendanceMap({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeClassId) {
      loadClassAttendance(activeClassId);
    }
  }, [activeClassId, selectedDate]);

  // To'g'ridan-to'g'ri holatni o'rnatish
  const handleSetStatus = (e: React.MouseEvent, studentId: string, status: AttendanceStatus) => {
    e.stopPropagation();
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Barchasini bir bosishda "Bor" deb belgilash
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; reason?: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'PRESENT' };
    });
    setAttendanceMap(updated);
  };

  // Davomatni topshirish
  const handleSaveAndSubmit = async () => {
    if (!activeClassId) return;
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
          class_id: activeClassId,
          date: selectedDate,
          records,
        }),
      });

      // 2. Topshirish
      await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClassId,
          date: selectedDate,
        }),
      });

      setIsSubmitted(true);
      const activeCls = classes.find((c) => c.id === activeClassId);
      setSuccessToast(`${activeCls?.name || 'Sinf'} davomati topshirildi!`);
      setTimeout(() => setSuccessToast(null), 3000);
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
  const absent = Object.values(attendanceMap).filter((s) => s.status === 'ABSENT_UNEXCUSED' || s.status === 'ABSENT_EXCUSED').length;
  const late = Object.values(attendanceMap).filter((s) => s.status === 'LATE').length;

  const activeClass = classes.find((c) => c.id === activeClassId);

  const filteredStudents = students.filter((s) => {
    if (searchStudent && !s.name.toLowerCase().includes(searchStudent.toLowerCase())) {
      return false;
    }
    const st = attendanceMap[s.id]?.status || 'PRESENT';
    if (filterMode === 'PRESENT' && st !== 'PRESENT') return false;
    if (filterMode === 'ABSENT' && st !== 'ABSENT_UNEXCUSED' && st !== 'ABSENT_EXCUSED') return false;
    if (filterMode === 'LATE' && st !== 'LATE') return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 pb-36 space-y-4 font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-emerald-400/40">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* ================= 1. QISQACHA MONITORING (DAVOMATCHI UCHUN) ================= */}
      {activeTab === 'inspector_monitor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Jami Sinflar
              </span>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{classes.length}</div>
            </div>
            <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Topshirilgan
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {classes.filter((c) => c.is_submitted).length}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Kutilmoqda
              </span>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {classes.filter((c) => !c.is_submitted).length}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Qamrov Ulushi
              </span>
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                {classes.length > 0
                  ? Math.round((classes.filter((c) => c.is_submitted).length / classes.length) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          {/* Sinflar topshirish holati ro'yxati */}
          <div className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Sinflar Kesimida Monitoring ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Qaysi sinf davomati topshirilgan yoki kutilayotganini ko‘rish
                </p>
              </div>

              {/* Smena almashtirgich */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setSelectedShift(1)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedShift === 1 ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  1-smena
                </button>
                <button
                  onClick={() => setSelectedShift(2)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedShift === 2 ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  2-smena
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classes.map((cls) => {
                const isDone = cls.is_submitted;
                return (
                  <div
                    key={cls.id}
                    onClick={() => setActiveClassId(cls.id)}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3 hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                        isDone ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}>
                        {cls.name}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {cls.name} sinfi {cls.room ? `(${cls.room})` : ''}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cls.teacher_name ? `Rahbar: ${cls.teacher_name}` : 'Rahbar biriktirilmagan'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Tayyor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Kutilmoqda
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 font-bold mt-1 tabular-nums">
                        {cls.present_count || 0} / {cls.total_students || 0} nafar
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. SINFLAR CAROUSEL / TABS (1-TAP CLASS SWITCHER) ================= */}
      {activeTab === 'inspector_classes' && (
        <>
          <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">meeting_room</span>
                <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white">Sinfni tanlang:</span>
              </div>

              {/* Smena almashtirgich */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setSelectedShift(1)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedShift === 1 ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  1-smena
                </button>
                <button
                  onClick={() => setSelectedShift(2)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedShift === 2 ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  2-smena
                </button>
              </div>
            </div>

            {/* Sinflar scroll rulo (Horizontal chip list) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {classes.map((cls) => {
                const isSelected = cls.id === activeClassId;
                const isDone = cls.is_submitted;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setActiveClassId(cls.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 active:scale-95 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30 ring-2 ring-blue-600/20'
                        : isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{cls.name}</span>
                    {isDone ? (
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    ) : (
                      <span className="text-[10px] opacity-75 font-semibold tabular-nums">({cls.total_students || 0})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= 3. ACTIVE CLASS KPI CARD ================= */}
          {activeClass && (
            <div className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {activeClass.name} sinfi {activeClass.room ? `(${activeClass.room}-xona)` : ''}
                    </h2>
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Topshirilgan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Kutilmoqda
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Sinf rahbari: <strong className="text-slate-900 dark:text-white">{activeClass.teacher_name || 'Biriktirilmagan'}</strong>
                  </p>
                </div>

                {/* Hammasini Bor qilish va O'quvchi qo'shish tugmalari */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span>+ O‘quvchi qo‘shish</span>
                  </button>

                  <button
                    onClick={handleMarkAllPresent}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                    <span>Barchasi Bor</span>
                  </button>
                </div>
              </div>

              {/* 4 ta Mini-Statistik Kartochkalar (Filtr Vazifasini Ham O'taydi) */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`p-3 rounded-2xl border transition-all ${
                    filterMode === 'ALL'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{total}</div>
                  <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mt-0.5">Jami</div>
                </button>

                <button
                  onClick={() => setFilterMode('PRESENT')}
                  className={`p-3 rounded-2xl border transition-all ${
                    filterMode === 'PRESENT'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 ring-2 ring-emerald-600/20'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{present}</div>
                  <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">Kelgan</div>
                </button>

                <button
                  onClick={() => setFilterMode('ABSENT')}
                  className={`p-3 rounded-2xl border transition-all ${
                    filterMode === 'ABSENT'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-600 ring-2 ring-rose-600/20'
                      : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                  }`}
                >
                  <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{absent}</div>
                  <div className="text-[11px] font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">Kelmagan</div>
                </button>

                <button
                  onClick={() => setFilterMode('LATE')}
                  className={`p-3 rounded-2xl border transition-all ${
                    filterMode === 'LATE'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-600 ring-2 ring-amber-600/20'
                      : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                  }`}
                >
                  <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{late}</div>
                  <div className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">Kechikkan</div>
                </button>
              </div>
            </div>
          )}

          {/* ================= 4. SEARCH BAR ================= */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="O‘quvchi ismini tezkor qidirish..."
              className="w-full h-11 pl-11 pr-4 bg-white dark:bg-[#0c121e] border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-600 outline-none transition-all shadow-2xs font-medium"
            />
            {searchStudent && (
              <button
                onClick={() => setSearchStudent('')}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* ================= 5. COMPACT STUDENT LIST ================= */}
          <div className="space-y-2.5">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <span className="material-symbols-outlined text-[36px] text-slate-400">person_search</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">O‘quvchilar topilmadi</p>
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const currentStatus = attendanceMap[student.id]?.status || 'PRESENT';
                const isPresent = currentStatus === 'PRESENT';
                const isAbsent = currentStatus === 'ABSENT_UNEXCUSED' || currentStatus === 'ABSENT_EXCUSED';
                const isLate = currentStatus === 'LATE';

                const indexNum = (idx + 1).toString().padStart(2, '0');

                return (
                  <div
                    key={student.id}
                    data-student-card="true"
                    onClick={() =>
                      setSelectedStudentForMonthly({
                        id: student.id,
                        name: student.name,
                        class_name: activeClass?.name,
                      })
                    }
                    className={`bg-white dark:bg-[#0c121e] rounded-2xl border p-3 flex items-center justify-between gap-3 transition-all cursor-pointer select-none shadow-2xs hover:shadow-xs ${
                      isPresent
                        ? 'border-slate-200/80 dark:border-slate-800 hover:border-blue-500'
                        : isAbsent
                        ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 ring-1 ring-rose-500/20'
                        : 'border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                    }`}
                  >
                    {/* Left: Index badge + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 tabular-nums ${
                          isPresent
                            ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                            : isAbsent
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {indexNum}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-extrabold truncate leading-tight ${
                            isAbsent ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {student.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1 font-medium">
                          <span>{student.gender === 'male' ? 'O‘g‘il bola' : 'Qiz bola'}</span>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">Taqvim</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Segmented 3-button control (Bor / Yo'q / Kech) */}
                    <div
                      className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shrink-0 border border-slate-200/60 dark:border-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleSetStatus(e, student.id, 'PRESENT')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Bor
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSetStatus(e, student.id, 'ABSENT_UNEXCUSED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAbsent
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Yo‘q
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSetStatus(e, student.id, 'LATE')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isLate
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Kech
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ================= 6. STICKY EXECUTION TRAY (DAVOMATNI TOPSHIRISH) ================= */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-lg z-40 lg:pl-72">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  {activeClass?.name || 'Sinf'} davomati
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{present} ta keldi</strong>,{' '}
                  <strong className="text-rose-600 dark:text-rose-400 tabular-nums">{absent} ta kelmadi</strong>
                </p>
              </div>

              <button
                onClick={handleSaveAndSubmit}
                disabled={saving || !activeClassId}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{saving ? 'Yuborilmoqda...' : 'Davomatni yuborish'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================= MODAL: O'QUVCHI OYLIK TAQVIMI ================= */}
      {selectedStudentForMonthly && (
        <StudentMonthlyModal
          student={selectedStudentForMonthly}
          currentDate={selectedDate}
          onClose={() => setSelectedStudentForMonthly(null)}
        />
      )}

      {/* ================= MODAL: YANGI O'QUVCHI QO'SHISH ================= */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onSuccess={() => {
          setSuccessToast('Yangi o‘quvchi muvaffaqiyatli qo‘shildi!');
          setTimeout(() => setSuccessToast(null), 3000);
          loadClasses();
          if (activeClassId) {
            loadClassAttendance(activeClassId);
          }
        }}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        defaultClassId={activeClassId}
        schoolId={schoolId}
      />
    </div>
  );
}
