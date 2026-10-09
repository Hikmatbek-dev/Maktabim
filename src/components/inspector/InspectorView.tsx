'use client';

import React, { useState, useEffect } from 'react';
import { SchoolClass, Student, AttendanceStatus, AttendanceRecord } from '@/lib/types';
import { 
  Users, CheckCircle2, XCircle, Clock, ArrowLeft, 
  Save, Send, ChevronRight, Check, AlertCircle, Sparkles, Filter 
} from 'lucide-react';

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

  // Bir tegishda almashtirish (Toggle: PRESENT <-> ABSENT_UNEXCUSED)
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

  // Barchasini "Kelgan" deb belgilash
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
      setSuccessToast(`${activeClass.name} sinf davomati muvaffaqiyatli topshirildi!`);
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
  const excused = Object.values(attendanceMap).filter((s) => s.status === 'ABSENT_EXCUSED').length;
  const late = Object.values(attendanceMap).filter((s) => s.status === 'LATE').length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28">
      {/* Toast xabari */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* AGAR SINF TANLANMAGAN BO'LSA - SINFLAR RO'YXATI */}
      {!activeClass ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Header & Smena tanlagich */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>📱 Davomatchi Paneli</span>
                <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">
                  Tezkor tekshiruv
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Sinfni tanlang va bitta teginishda kelmagan o‘quvchilarni belgilang
              </p>
            </div>

            {/* Smena tugmalari */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
              <button
                onClick={() => setSelectedShift(1)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  selectedShift === 1
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1-Smena (Ertalab)
              </button>
              <button
                onClick={() => setSelectedShift(2)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  selectedShift === 2
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2-Smena (Tushdan keyin)
              </button>
            </div>
          </div>

          {/* Sinflar kartochkalari - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {classes.map((cls) => {
              const isDone = cls.is_submitted;
              return (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer tap-active relative overflow-hidden group hover:shadow-md ${
                    isDone
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isDone ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-800 group-hover:text-blue-600 flex items-center justify-center font-black text-xl transition-colors">
                        {cls.name}
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium">
                          {cls.room || 'Xona belgilanmagan'}
                        </span>
                        <div className="text-xs font-semibold text-slate-700">
                          {cls.teacher_name || 'Sinf rahbari biriktirilmagan'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Topshirilgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> Kutilmoqda
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Statistika qatori */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1 text-slate-600 font-medium">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{cls.total_students} o‘quvchi</span>
                    </div>

                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-emerald-600">✓ {cls.present_count}</span>
                      <span className="text-red-500">✕ {cls.unexcused_count}</span>
                      {cls.excused_count > 0 && <span className="text-amber-500">⚠ {cls.excused_count}</span>}
                      <span className="text-slate-400">({cls.percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* AGAR SINF TANLANGAN BO'LSA - TEZKOR TEKSHIRUV EKRANI */
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="sticky top-16 z-20 bg-white/95 backdrop-blur p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveClass(null)}
                className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">{activeClass.name} sinfi</h2>
                  {isSubmitted && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      Topshirilgan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {activeClass.teacher_name ? `Sinf rahbari: ${activeClass.teacher_name}` : 'Sinf rahbari yo‘q'}
                </p>
              </div>
            </div>

            {/* Tezkor hisoblagichlar va "Barchasini keldi qilish" */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold gap-3">
                <span className="text-slate-700">Jami: {total}</span>
                <span className="text-emerald-700">Kelgan: {present}</span>
                <span className="text-red-600">Kelmadi: {absent}</span>
                {excused > 0 && <span className="text-amber-600">Sababli: {excused}</span>}
                {late > 0 && <span className="text-blue-600">Kechikkan: {late}</span>}
              </div>

              <button
                onClick={handleMarkAllPresent}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hammasi kelgan</span>
              </button>
            </div>
          </div>

          {/* O'quvchilar ro'yxati: Mobile-optimized Quick-Tap UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {students.map((student, idx) => {
              const currentStatus = attendanceMap[student.id]?.status || 'PRESENT';
              const isPresent = currentStatus === 'PRESENT';
              const isAbsent = currentStatus === 'ABSENT_UNEXCUSED';
              const isExcused = currentStatus === 'ABSENT_EXCUSED';
              const isLate = currentStatus === 'LATE';

              return (
                <div
                  key={student.id}
                  onClick={() => handleToggleStatus(student.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer tap-active select-none flex items-center justify-between ${
                    isPresent
                      ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                      : isAbsent
                      ? 'bg-red-50/90 border-red-400 shadow-sm'
                      : isExcused
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Raqam */}
                    <span className="text-xs font-bold text-slate-400 w-5">
                      {idx + 1}.
                    </span>

                    {/* O'quvchi ismi */}
                    <div>
                      <h3
                        className={`text-sm sm:text-base font-bold ${
                          isAbsent
                            ? 'text-red-900 line-through decoration-red-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {student.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {student.gender === 'male' ? 'O‘g‘il bola' : 'Qiz bola'}
                        {attendanceMap[student.id]?.reason && (
                          <span className="ml-1 text-amber-700 font-medium">
                            • {attendanceMap[student.id]?.reason}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Holat tugmasi / Indikator */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Tezkor status tanlagich */}
                    <div className="flex items-center bg-white/80 backdrop-blur rounded-xl p-1 border border-slate-200 shadow-xs">
                      <button
                        title="Kelgan"
                        onClick={() => handleSetStatus(student.id, 'PRESENT')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPresent
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        title="Sababsiz kelmagan"
                        onClick={() => handleSetStatus(student.id, 'ABSENT_UNEXCUSED')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isAbsent
                            ? 'bg-red-600 text-white font-bold'
                            : 'text-slate-400 hover:text-red-600'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        title="Kechikkan"
                        onClick={() => handleSetStatus(student.id, 'LATE')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isLate
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-400 hover:text-blue-600'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pastki qatorda o'tiruvchi yirik "Topshirish" paneli (Mobile sticky) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:p-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-semibold text-slate-700 hidden sm:block">
                <span>{activeClass.name} sinf: </span>
                <span className="text-emerald-600">{present} keldi</span>,{' '}
                <span className="text-red-600">{absent} kelmadi</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveClass(null)}
                  className="w-1/3 sm:w-auto px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                >
                  Orqaga
                </button>
                <button
                  onClick={handleSaveAndSubmit}
                  disabled={saving}
                  className="w-2/3 sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{saving ? 'Saqlanmoqda...' : 'Davomatni topshirish'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
