'use client';

import React, { useState, useEffect } from 'react';
import { User, Student, AttendanceStatus } from '@/lib/types';
import { StudentMonthlyModal } from '../StudentMonthlyModal';
import { AddStudentModal } from '../AddStudentModal';
import { EditStudentModal, EditableStudent } from '../EditStudentModal';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';

interface TeacherViewProps {
  user: User;
  selectedDate: string;
  schoolId?: string;
  activeTab?: 'teacher_monitor' | 'teacher_attendance';
}

export function TeacherView({ user, selectedDate, schoolId, activeTab = 'teacher_attendance' }: TeacherViewProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>(user.assigned_class_id || 'cls_5a');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // O'quvchi qo'shish va tahrirlash modallari
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EditableStudent | null>(null);

  // O'quvchi oylik kalendar modali
  const [selectedStudentForMonthly, setSelectedStudentForMonthly] = useState<any | null>(null);

  // Sabab kiritish modali
  const [selectedStudentForReason, setSelectedStudentForReason] = useState<any | null>(null);
  const [reasonType, setReasonType] = useState<string>('Kasallik (spravka bor)');
  const [customNote, setCustomNote] = useState<string>('');

  // 36+ soat dars qoldirgan xavf guruhi o'quvchilari
  const [riskStudents, setRiskStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
        const res = await fetch(`/api/stats?date=${selectedDate}${schoolParam}`);
        const data = await res.json();
        if (data.risk_students) {
          setRiskStudents(data.risk_students);
        }
      } catch (err) {
        console.error('Error fetching risk students for teacher:', err);
      }
    };
    fetchStats();
  }, [selectedDate, schoolId]);

  // Sinflarni yuklash
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
        const res = await fetch(`/api/classes?date=${selectedDate}${schoolParam}`);
        const data = await res.json();
        if (data.classes && data.classes.length > 0) {
          setClasses(data.classes);
          // Ustoz faqat o'ziga biriktirilgan yagona sinfga ega bo'ladi
          const teacherClass = data.classes.find(
            (c: any) => c.id === user.assigned_class_id || c.teacher_id === user.id
          );
          if (teacherClass) {
            setActiveClassId(teacherClass.id);
          } else if (user.assigned_class_id) {
            setActiveClassId(user.assigned_class_id);
          } else {
            setActiveClassId(data.classes[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, [selectedDate, schoolId, user.assigned_class_id, user.id]);

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

  // Holatni o'zgartirish (Bor, Kelmagan, Kechikkan)
  const handleUpdateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  // Davomatni saqlash
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map((s) => ({
        student_id: s.student_id,
        status: s.status,
        reason: s.reason || null,
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClassId,
          date: selectedDate,
          records,
        }),
      });

      if (res.ok) {
        setToast('Sinf davomati muvaffaqiyatli saqlandi!');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Sabab saqlash
  const handleSaveReason = () => {
    if (!selectedStudentForReason) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === selectedStudentForReason.student_id
          ? { ...s, status: 'ABSENT_EXCUSED', reason: `${reasonType}: ${customNote}` }
          : s
      )
    );
    setSelectedStudentForReason(null);
    setCustomNote('');
  };

  // O'quvchini o'chirish
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Haqiqatan ham "${studentName}" o‘quvchisini va uning barcha davomatini o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        setToast('O‘quvchi muvaffaqiyatli o‘chirildi');
        setTimeout(() => setToast(null), 3000);
        loadClassAttendance();
      } else {
        const d = await res.json();
        alert(d.error || 'O‘chirishda xatolik yuz berdi');
      }
    } catch (e) {
      console.error(e);
      alert('Server bilan aloqa uzildi');
    }
  };

  const currentClass = classes.find((c) => c.id === activeClassId) || {
    name: user.assigned_class_name || '5-A',
    shift: 1,
    room: '101-xona',
  };

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const unexcusedCount = students.filter((s) => s.status === 'ABSENT_UNEXCUSED').length;
  const excusedCount = students.filter((s) => s.status === 'ABSENT_EXCUSED').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;
  const totalCount = students.length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const classRiskStudents = riskStudents.filter(
    (st) => st.class_id === activeClassId || st.class_name === currentClass?.name
  );

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 pb-24 space-y-4 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-emerald-400/40">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* ================= SINF JURNALI BANNERI ================= */}
      <div className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/25 ring-4 ring-indigo-50 dark:ring-indigo-950/40 shrink-0">
            {currentClass?.name || '5-A'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentClass?.name || '5-A'} {activeTab === 'teacher_monitor' ? 'Statistikasi' : 'Sinf Jurnali'}
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Yagona biriktirilgan sinf
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
              <span>Sinf rahbari: <strong className="text-slate-900 dark:text-white">{user.name}</strong></span>
              <span>•</span>
              <span>Sana: <strong className="text-slate-700 dark:text-slate-300">{selectedDate}</strong></span>
              {currentClass?.room && <span>• {currentClass.room}</span>}
            </p>
          </div>
        </div>

        {/* Tezkor "Barchasi bor" tugmasi */}
        {activeTab !== 'teacher_monitor' && (
          <button
            type="button"
            onClick={() => {
              setStudents((prev) => prev.map((s) => ({ ...s, status: 'PRESENT' })));
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all self-start sm:self-auto shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            <span>Barchasi Bor</span>
          </button>
        )}
      </div>

      {/* ================= SINF MONITORINGI (USTOZ UCHUN KPI) ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Jami O‘quvchi</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{totalCount}</div>
        </div>
        <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Kelgan</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{presentCount}</div>
        </div>
        <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Sababsiz</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{unexcusedCount}</div>
        </div>
        <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Sababli</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{excusedCount}</div>
        </div>
        <div className="bg-white dark:bg-[#0c121e] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Davomat %</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{attendanceRate}%</div>
        </div>
      </div>

      {/* ================= MONITORING TAB: ANALITIKA & GRAFIKLAR ================= */}
      {activeTab === 'teacher_monitor' && (
        <div className="space-y-6">
          <AnalyticsDashboard
            role="TEACHER"
            selectedDate={selectedDate}
            schoolId={schoolId}
            classId={activeClassId}
            className={currentClass?.name}
            classes={classes}
            onSelectStudentMonthly={setSelectedStudentForMonthly}
          />

          <div className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">warning</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Xavf Guruhi (36+ soat dars qoldirganlar)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Jami 36 ta dars (6+ kun) va undan ko‘p sababsiz dars qoldirgan o‘quvchilar
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full text-[11px] font-extrabold">
                {classRiskStudents.length > 0 ? `${classRiskStudents.length} nafar sinfda` : `${riskStudents.length} nafar maktabda`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(classRiskStudents.length > 0 ? classRiskStudents : riskStudents).length === 0 ? (
                <div className="col-span-full py-8 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-[28px] text-emerald-500">check_circle</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">36+ soat qoldirgan o‘quvchilar yo‘q</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sinfingizda surunkali dars qoldirgan o‘quvchi aniqlanmadi</p>
                </div>
              ) : (
                (classRiskStudents.length > 0 ? classRiskStudents : riskStudents).map((st: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => setSelectedStudentForMonthly({ id: st.id, name: st.name, class_name: st.class_name })}
                    className="p-3.5 bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 font-extrabold text-xs shrink-0 ring-2 ring-rose-50 dark:ring-rose-900/30">
                        {st.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight truncate group-hover:text-blue-600 transition-colors">
                          {st.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 rounded-md text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                            {st.class_name}
                          </span>
                          <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-[11px] text-rose-700 dark:text-rose-300 font-extrabold rounded-md">
                            {st.missed_hours || (st.unexcused_days * 6)} soat ({st.unexcused_days} kun)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {st.parent_phone && (
                        <a
                          href={`tel:${st.parent_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all"
                          title="Ota-onasiga qo‘ng‘iroq qilish"
                        >
                          <span className="material-symbols-outlined text-[16px]">call</span>
                        </a>
                      )}
                      <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:text-blue-600 transition-colors">
                        calendar_month
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE TAB: AGAR SINFDA 36+ SOAT QOLDIRGANLAR BO'LSA OGOHLANTIRISH ================= */}
      {activeTab === 'teacher_attendance' && classRiskStudents.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">
                Xavf Guruhi Ogohlantirishi: Sinfingizda 36+ soat dars qoldirgan {classRiskStudents.length} nafar o‘quvchi mavjud!
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Ushbu o‘quvchilar ro‘yxatda maxsus qizil nishon bilan belgilangan.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-300 dark:border-rose-800 shrink-0">
            36+ soat
          </span>
        </div>
      )}

      {/* ================= O'QUVCHILAR RO'YXATI VA DAVOMAT QILISH ================= */}
      <div className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Sinf O‘quvchilari Davomati ({students.length} nafar)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              O‘quvchi qatoriga bosib oylik taqvimni ko‘rishingiz mumkin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ O‘quvchi qo‘shish</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">Yuklanmoqda...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">O‘quvchilar topilmadi</div>
          ) : (
            students.map((st, idx) => {
              const isPresent = st.status === 'PRESENT';
              const isAbsent = st.status === 'ABSENT_UNEXCUSED' || st.status === 'ABSENT_EXCUSED';
              const isLate = st.status === 'LATE';
              const isRiskStudent = riskStudents.some((rs) => rs.id === st.student_id);
              const riskInfo = riskStudents.find((rs) => rs.id === st.student_id);

              return (
                <div
                  key={st.student_id || idx}
                  onClick={() =>
                    setSelectedStudentForMonthly({
                      id: st.student_id,
                      name: st.student_name,
                      class_name: currentClass?.name,
                    })
                  }
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs ${
                    isPresent
                      ? 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-blue-500'
                      : isAbsent
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 ring-1 ring-rose-500/20'
                      : 'border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs sm:text-sm font-extrabold leading-tight break-words ${
                          isAbsent ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {st.student_name}
                        </p>
                        {isRiskStudent && (
                          <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-black rounded-md border border-rose-300 dark:border-rose-800 shrink-0">
                            ⚠️ {riskInfo?.missed_hours || (riskInfo?.unexcused_days * 6) || 36}+ soat
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                        {st.parent_name || 'Ota-ona'} {st.parent_phone && `(${st.parent_phone})`}
                        {st.reason && <span className="text-amber-600 dark:text-amber-400 font-bold ml-1.5">• {st.reason}</span>}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 sm:gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(st.student_id, 'PRESENT')}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(st.student_id, 'ABSENT_UNEXCUSED')}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                        isAbsent
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Yo‘q
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(st.student_id, 'LATE')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isLate
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Kech
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForReason(st)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="Sabab kiritish"
                    >
                      <span className="material-symbols-outlined text-[18px]">note_add</span>
                    </button>

                    {/* Tahrirlash tugmasi */}
                    <button
                      type="button"
                      onClick={() => setEditingStudent({
                        id: st.student_id,
                        name: st.student_name,
                        class_id: activeClassId,
                        gender: st.gender,
                        parent_name: st.parent_name,
                        parent_phone: st.parent_phone,
                      })}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="O‘quvchini tahrirlash"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    {/* O'chirish tugmasi */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(st.student_id, st.student_name)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="O‘quvchini o‘chirish"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODAL: SABAB KIRITISH ================= */}
      {selectedStudentForReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Dars qoldirish sababi: {selectedStudentForReason.student_name}
            </h3>

            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
            >
              <option value="Kasallik (spravka bor)">Kasallik (spravka bor)</option>
              <option value="Oilaviy sabab">Oilaviy sabab</option>
              <option value="Musobaqa yoki olimpiada">Musobaqa yoki olimpiada</option>
              <option value="Boshqa uzrli sabab">Boshqa uzrli sabab</option>
            </select>

            <textarea
              placeholder="Qo‘shimcha izoh..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white resize-none h-20 outline-none focus:border-blue-600"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedStudentForReason(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveReason}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 transition-all"
              >
                Sababni saqlash
              </button>
            </div>
          </div>
        </div>
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
          setToast('Yangi o‘quvchi sinfga qo‘shildi!');
          setTimeout(() => setToast(null), 3000);
          loadClassAttendance();
        }}
        classes={
          classes.length > 0
            ? classes.filter((c) => c.id === activeClassId).map((c) => ({ id: c.id, name: c.name }))
            : [{ id: activeClassId, name: currentClass.name || 'Sinf' }]
        }
        defaultClassId={activeClassId}
        schoolId={schoolId}
      />

      {/* ================= MODAL: O'QUVCHINI TAHRIRLASH ================= */}
      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSuccess={(deleted) => {
          setToast(deleted ? 'O‘quvchi muvaffaqiyatli o‘chirildi' : 'O‘quvchi ma’lumotlari yangilandi');
          setTimeout(() => setToast(null), 3000);
          loadClassAttendance();
        }}
        student={editingStudent}
        classes={
          classes.length > 0
            ? classes.filter((c) => c.id === activeClassId).map((c) => ({ id: c.id, name: c.name }))
            : [{ id: activeClassId, name: currentClass.name || 'Sinf' }]
        }
      />
    </div>
  );
}
