'use client';

import React, { useState, useEffect } from 'react';
import { StudentMonthlyModal } from '../StudentMonthlyModal';
import { AddStudentModal } from '../AddStudentModal';
import { EditStudentModal, EditableStudent } from '../EditStudentModal';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';

interface DirectorViewProps {
  selectedDate: string;
  schoolId?: string;
  activeTab?: 'director_summary' | 'classes' | 'attendance_reports' | 'staff';
}

export function DirectorView({ selectedDate, schoolId, activeTab = 'director_summary' }: DirectorViewProps) {
  const [stats, setStats] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filterShift, setFilterShift] = useState<'ALL' | '1' | '2'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sinf davomatini ko'rish modali
  const [selectedClassModal, setSelectedClassModal] = useState<any | null>(null);
  const [classDetailsLoading, setClassDetailsLoading] = useState(false);
  const [classStudents, setClassStudents] = useState<any[]>([]);

  // O'quvchi qo'shish va tahrirlash modallari
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addStudentTargetClassId, setAddStudentTargetClassId] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<EditableStudent | null>(null);

  // O'quvchi oylik kalendar modali
  const [selectedStudentForMonthly, setSelectedStudentForMonthly] = useState<any | null>(null);

  // Sababli kiritish modali
  const [selectedStudentForReason, setSelectedStudentForReason] = useState<any | null>(null);
  const [reasonType, setReasonType] = useState<string>('Kasallik (spravka bor)');
  const [customNote, setCustomNote] = useState<string>('');
  const [reasonSaving, setReasonSaving] = useState(false);

  // Xodim qo'shish modali holati
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'TEACHER' | 'INSPECTOR' | 'DEPUTY_DIRECTOR'>('TEACHER');
  const [newStaffPhone, setNewStaffPhone] = useState('+998');
  const [newStaffClassId, setNewStaffClassId] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Xodim batafsil va login-parol ko'rish modali
  const [selectedStaffModal, setSelectedStaffModal] = useState<any | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [cardRevealedPasswords, setCardRevealedPasswords] = useState<Record<string, boolean>>({});
  const [staffNewPassword, setStaffNewPassword] = useState('');
  const [updatingStaffPassword, setUpdatingStaffPassword] = useState(false);

  // O'qituvchilar dars kuni va dars jadvali holati
  const [teacherDayFilter, setTeacherDayFilter] = useState<string>('ALL');
  const [staffViewMode, setStaffViewMode] = useState<'cards' | 'schedule'>('cards');
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<any | null>(null);

  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast(`${label} nusxalandi!`);
  };

  const handleUpdateStaffPassword = async (staffId: string) => {
    if (!staffNewPassword || staffNewPassword.trim().length < 4) {
      alert('Parol kamida 4 ta belgidan iborat bo‘lishi kerak');
      return;
    }
    setUpdatingStaffPassword(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staffId,
          newPassword: staffNewPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Parolni yangilashda xatolik yuz berdi');
        return;
      }
      showToast('Yangi parol muvaffaqiyatli saqlandi!');
      if (selectedStaffModal) {
        setSelectedStaffModal((prev: any) => ({ ...prev, raw_password: staffNewPassword.trim() }));
      }
      setStaffNewPassword('');
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Server bilan bog‘lanishda xatolik');
    } finally {
      setUpdatingStaffPassword(false);
    }
  };

  // O'quvchi davomat holatini saqlash (Sababli, Bor, Sababsiz, Kechikkan)
  const handleSaveStudentStatus = async (studentId: string, status: string, reasonText?: string) => {
    if (!selectedClassModal) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassModal.id,
          date: selectedDate,
          records: [
            {
              student_id: studentId,
              status,
              reason: reasonText || null,
            },
          ],
        }),
      });
      if (res.ok) {
        showToast('Davomat holati saqlandi');
        handleOpenClassDetails(selectedClassModal);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
      alert('Xatolik yuz berdi');
    }
  };

  const handleSaveReasonModal = async () => {
    if (!selectedStudentForReason) return;
    setReasonSaving(true);
    await handleSaveStudentStatus(
      selectedStudentForReason.student_id,
      'ABSENT_EXCUSED',
      `${reasonType}: ${customNote}`
    );
    setReasonSaving(false);
    setSelectedStudentForReason(null);
    setCustomNote('');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users?school_id=${schoolId || 'sch_1'}`);
      const data = await res.json();
      if (data && Array.isArray(data.users)) {
        setStaffList(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
      const [statsRes, classesRes, usersRes] = await Promise.all([
        fetch(`/api/stats?date=${selectedDate}${schoolParam}`),
        fetch(`/api/classes?date=${selectedDate}${schoolParam}`),
        fetch(`/api/users?school_id=${schoolId || 'sch_1'}`),
      ]);

      const statsData = await statsRes.json();
      const classesData = await classesRes.json();
      const usersData = await usersRes.json();

      setStats(statsData);
      setClasses(classesData.classes || []);
      if (usersData && Array.isArray(usersData.users)) {
        setStaffList(usersData.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedDate, schoolId]);

  // Yangi xodim qo'shish
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName,
          username: newStaffUsername,
          password: newStaffPassword,
          role: newStaffRole,
          phone: newStaffPhone,
          school_id: schoolId || 'sch_1',
          assigned_class_id: newStaffRole === 'TEACHER' ? newStaffClassId || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || 'Xodimni saqlashda xatolik yuz berdi');
        setStaffSaving(false);
        return;
      }

      showToast(`Yangi xodim qo‘shildi: ${newStaffName}`);
      setIsAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffClassId('');
      fetchUsers();
      fetchAllData();
    } catch (err) {
      console.error(err);
      setStaffError('Server bilan bog‘lanishda xatolik');
    } finally {
      setStaffSaving(false);
    }
  };

  // Xodimni o'chirish
  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" xodimini o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Xodim o‘chirildi: ${name}`);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'O‘chirishda xatolik yuz berdi');
      }
    } catch (e) {
      console.error(e);
      alert('Xatolik yuz berdi');
    }
  };

  // Sinf tafsilotini yuklash
  const handleOpenClassDetails = async (cls: any) => {
    setSelectedClassModal(cls);
    setClassDetailsLoading(true);
    try {
      const res = await fetch(`/api/attendance?class_id=${cls.id}&date=${selectedDate}`);
      const data = await res.json();
      setClassStudents(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setClassDetailsLoading(false);
    }
  };

  // O'quvchini o'chirish
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Haqiqatan ham "${studentName}" o‘quvchisini va uning barcha davomatini o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('O‘quvchi muvaffaqiyatli o‘chirildi');
        fetchAllData();
        if (selectedClassModal) {
          handleOpenClassDetails(selectedClassModal);
        }
      } else {
        const d = await res.json();
        alert(d.error || 'O‘chirishda xatolik yuz berdi');
      }
    } catch (e) {
      console.error(e);
      alert('Server bilan aloqa uzildi');
    }
  };

  // Excel yuklab olish
  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
      const response = await fetch(`/api/reports/export?date=${selectedDate}${schoolParam}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maktab_davomat_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Excel yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloading(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (filterShift !== 'ALL' && c.shift.toString() !== filterShift) return false;
    if (filterStatus === 'SUBMITTED' && !c.is_submitted) return false;
    if (filterStatus === 'PENDING' && c.is_submitted) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const attendanceRate = stats?.attendance_rate ?? 0;
  const totalStudents = stats?.total_students ?? 841;
  const totalPresent = stats?.total_present ?? 0;
  const totalUnexcused = stats?.total_absent_unexcused ?? 0;
  const totalExcused = stats?.total_absent_excused ?? 0;

  const totalClassesCount = classes.length;
  const submittedClassesCount = classes.filter((c) => c.is_submitted).length;
  const pendingClassesCount = totalClassesCount - submittedClassesCount;
  const submittedPercent = totalClassesCount > 0 ? Math.round((submittedClassesCount / totalClassesCount) * 100) : 0;

  // Real smena ko'rsatkichlari
  const s1 = stats?.shift1_stats || { total: 0, present: 0, rate: 0 };
  const s2 = stats?.shift2_stats || { total: 0, present: 0, rate: 0 };

  // Xavf guruhi
  const riskStudents = stats?.risk_students || [];

  return (
    <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-5 font-sans">
      {/* ================= 1. EXECUTIVE BANNER & REAL-TIME CONTROLS ================= */}
      <section className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 ring-4 ring-blue-50 dark:ring-blue-950/40 shrink-0">
            <span className="material-symbols-outlined text-[28px]">
              {activeTab === 'staff' ? 'badge' : activeTab === 'classes' ? 'meeting_room' : 'analytics'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'director_summary' && 'Maktab bo‘yicha kunlik xulosa'}
                {activeTab === 'classes' && 'Sinflar Ro‘yxati va Jurnali'}
                {activeTab === 'attendance_reports' && 'Davomat Ma’lumotlari (Xulosa)'}
                {activeTab === 'staff' && 'Maktab Xodimlari va O‘qituvchilari'}
              </h1>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Direktor Nazorati
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 font-medium">
              <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">calendar_today</span>
              <span>{selectedDate}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{stats?.school_name || 'Urganch tuman 3-sonli umumiy o‘rta ta’lim maktabi'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {activeTab === 'staff' ? (
            /* Hafta Kunlari & Dars Jadvali Filtrlari (O'qituvchilar va Xodimlar uchun) */
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <button
                  onClick={() => setTeacherDayFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    teacherDayFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Barcha kunlar
                </button>
                {['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'].map((day) => {
                  const shortName = day.slice(0, 4);
                  const isActive = teacherDayFilter === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setTeacherDayFilter(day)}
                      className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>

              {/* Ko'rinish rejimi: Xodimlar kartalari yoki Umumiy Dars Jadvali */}
              <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <button
                  onClick={() => setStaffViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    staffViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>Xodimlar</span>
                </button>
                <button
                  onClick={() => setStaffViewMode('schedule')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    staffViewMode === 'schedule'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  <span>Dars Jadvali</span>
                </button>
              </div>
            </div>
          ) : (
            /* Shift Segmented Toggle (Sinflar va umumiy hisobot uchun) */
            <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <button
                onClick={() => setFilterShift('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filterShift === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Hammasi
              </button>
              <button
                onClick={() => setFilterShift('1')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filterShift === '1'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1-smena
              </button>
              <button
                onClick={() => setFilterShift('2')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filterShift === '2'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2-smena
              </button>
            </div>
          )}

          {/* Excel Export CTA */}
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>{downloading ? 'Yuklanmoqda...' : 'Excelga yuklash'}</span>
          </button>
        </div>
      </section>

      {/* ================= ANALYTICS DASHBOARD (KUNLIK, HAFTALIK, OYLIK, YILLIK & REYTING) ================= */}
      {(activeTab === 'director_summary' || activeTab === 'attendance_reports') && (
        <AnalyticsDashboard
          role="DIRECTOR"
          selectedDate={selectedDate}
          schoolId={schoolId}
          classes={classes}
          onSelectStudentMonthly={setSelectedStudentForMonthly}
        />
      )}

      {/* ================= SECTION 1: KUNLIK QISQACHA XULOSA ================= */}
      {false && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0c121e] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Umumiy Davomat
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                      {attendanceRate}%
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      +1.4%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                  <span className="material-symbols-outlined text-[26px]">insights</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Jami o‘quvchilar:</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{totalStudents} nafar</span>
              </div>
            </div>

            {/* KPI 2: Qatnashayotganlar */}
            <div className="bg-white dark:bg-[#0c121e] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Qatnashayotganlar
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {totalPresent}
                    </span>
                    <span className="text-slate-400 text-xs font-semibold tabular-nums">/ {totalStudents}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 rounded-full text-[11px] font-extrabold">
                  Yuqori
                </span>
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, attendanceRate)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Qamrov ulushi</span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{attendanceRate}%</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Sababsiz Dars Qoldirganlar */}
            <div className="bg-white dark:bg-[#0c121e] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Sababsiz Kelmagan
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                      {totalUnexcused}
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300 font-extrabold bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/60 tabular-nums">
                      {totalStudents > 0 ? ((totalUnexcused / totalStudents) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs">
                  <span className="material-symbols-outlined text-[26px]">person_off</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">priority_high</span>
                  Nazoratda
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">{totalExcused} ta sababli</span>
              </div>
            </div>

            {/* KPI 4: Jurnallar Holati */}
            <div className="bg-white dark:bg-[#0c121e] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Jurnallar Holati
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {submittedClassesCount}
                    </span>
                    <span className="text-slate-400 text-xs font-semibold tabular-nums">
                      / {totalClassesCount} sinf
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900 rounded-full text-[11px] font-extrabold">
                    {submittedPercent}%
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                  {pendingClassesCount} ta kutilmoqda
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{submittedClassesCount} tayyor</span>
              </div>
            </div>
          </section>

          {/* Smenalar va Xavf Guruhi Taqqoslovi */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Smenalar grafigi */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Smenalararo Davomat va Faollik
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    Jonli ko‘rsatkich
                  </span>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between text-xs sm:text-[13px] mb-2">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"></span>
                        1-Smena (8, 9, 10, 11-sinflar • 08:00 – 13:00)
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{s1.rate}% ({s1.present}/{s1.total})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full" style={{ width: `${s1.rate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs sm:text-[13px] mb-2">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900"></span>
                        2-Smena (5, 6, 7-sinflar • 13:30 – 18:30)
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{s2.rate}% ({s2.present}/{s2.total})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full" style={{ width: `${s2.rate}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>O‘rtacha qamrov darajasi: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums">{attendanceRate}%</strong></span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Kundalik avtomatik hisob</span>
              </div>
            </div>

            {/* Xavf guruhi */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600 text-[22px]">warning</span>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Xavf Guruhi (36+ soat)</h2>
                  </div>
                  <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full text-[11px] font-extrabold">
                    {riskStudents.length} nafar o‘quvchi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  Jami 36 ta dars va undan ko‘p sababsiz dars qoldirgan o‘quvchilar:
                </p>

                <div className="space-y-2.5">
                  {riskStudents.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <span className="material-symbols-outlined text-[28px] text-emerald-500">check_circle</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">36+ soat qoldirgan o‘quvchilar yo‘q</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Surunkali dars qoldirganlar aniqlanmadi</p>
                    </div>
                  ) : (
                    riskStudents.map((st: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => setSelectedStudentForMonthly({ id: st.id, name: st.name, class_name: st.class_name })}
                        className="p-3 bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center justify-between gap-2 cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 font-extrabold text-xs shrink-0 ring-2 ring-rose-50 dark:ring-rose-900/30">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
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

                        <div className="flex items-center gap-1.5">
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

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-rose-600 dark:text-rose-400 font-bold">Nazorat daftarchasida</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Taqvimni ko‘rish uchun bosing</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= SECTION 2: SINFLAR VA JURNALLAR ================= */}
      {(activeTab === 'classes' || activeTab === 'director_summary') && (
        <section className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Sinflar Kesimida Davomat Jurnali
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                  {classes.length} ta sinf
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sinf qatorini bosing — o‘quvchilar ro‘yxati va yo‘qlama holati ochiladi
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sinf yoki ustoz..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 w-40 sm:w-48 font-medium"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">Barchasi</option>
                <option value="SUBMITTED">Topshirilgan</option>
                <option value="PENDING">Kutilmoqda</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setAddStudentTargetClassId('');
                  setIsAddStudentOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ O‘quvchi qo‘shish</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sinf</th>
                  <th className="py-3.5 px-4">Smena</th>
                  <th className="py-3.5 px-4">Sinf rahbari</th>
                  <th className="py-3.5 px-4 text-center">Jami</th>
                  <th className="py-3.5 px-4 text-center">Qatnashdi</th>
                  <th className="py-3.5 px-4">Qoldirdi</th>
                  <th className="py-3.5 px-4">Davomat %</th>
                  <th className="py-3.5 px-4 text-center">Holat</th>
                  <th className="py-3.5 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13px] text-slate-800 dark:text-slate-200 font-medium">
                {filteredClasses.map((c) => {
                  const isDone = c.is_submitted;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenClassDetails(c)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400 text-sm group-hover:underline">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-bold">
                          {c.shift}-smena
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {c.teacher_name || 'Biriktirilmagan'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold tabular-nums">{c.total_students}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {c.present_count}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {c.unexcused_count} sababsiz
                        </span>
                        {c.excused_count > 0 && (
                          <span className="text-slate-400 text-xs ml-1 tabular-nums">
                            ({c.excused_count} sababli)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs tabular-nums font-extrabold ${
                            c.percentage >= 90
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {c.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold rounded-full border border-emerald-200/80 dark:border-emerald-800">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Topshirildi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold rounded-full border border-amber-200/80 dark:border-amber-800">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Kutilmoqda
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="p-1.5 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-emerald-400/40">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ================= SECTION 3: XODIMLAR RO'YXATI VA BOSHQARUVI ================= */}
      {activeTab === 'staff' && (
        <section className="bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Maktab Xodimlari va O‘qituvchilar Jadvali
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                  {staffList.length} nafar xodim
                </span>
                {teacherDayFilter !== 'ALL' && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">
                    {teacherDayFilter} kuni
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                O‘qituvchilar dars jadvali, sinf rahbarlari, login-parollar va ma’muriyat akkauntlari
              </p>
            </div>

            {/* + Yangi Xodim Qo'shish Tugmasi */}
            <button
              onClick={() => {
                setStaffError(null);
                setIsAddStaffModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 active:scale-95 transition-all self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Yangi Xodim Qo‘shish</span>
            </button>
          </div>

          {/* Dars Jadvali Ko'rinishi (Table) */}
          {staffViewMode === 'schedule' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>
                    {teacherDayFilter === 'ALL'
                      ? 'Dushanba kuni dars jadvali (Hafta boshi)'
                      : `${teacherDayFilter} kuni dars jadvali`}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Jami dars o‘tadigan o‘qituvchilar: {staffList.filter((s) => s.role === 'TEACHER').length} nafar
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 min-w-[180px]">O‘qituvchi F.I.Sh</th>
                      <th className="py-3 px-3 min-w-[110px]">1-soat (08:00)</th>
                      <th className="py-3 px-3 min-w-[110px]">2-soat (08:50)</th>
                      <th className="py-3 px-3 min-w-[110px]">3-soat (09:40)</th>
                      <th className="py-3 px-3 min-w-[110px]">4-soat (10:35)</th>
                      <th className="py-3 px-3 min-w-[110px]">5-soat (11:25)</th>
                      <th className="py-3 px-3 min-w-[110px]">6-soat (12:15)</th>
                      <th className="py-3 px-3 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {staffList
                      .filter((s) => s.role === 'TEACHER')
                      .map((st) => {
                        const day = teacherDayFilter === 'ALL' ? 'Dushanba' : teacherDayFilter;
                        const lessons = st.schedule?.[day] || [];
                        const getLesson = (hour: number) => lessons.find((l: any) => l.hour === hour);

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white">{st.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span className="font-mono text-blue-600 dark:text-blue-400">@{st.username}</span>
                                {st.assigned_class_name && (
                                  <span>• {st.assigned_class_name} sinfi</span>
                                )}
                              </div>
                            </td>
                            {[1, 2, 3, 4, 5, 6].map((h) => {
                              const ls = getLesson(h);
                              return (
                                <td key={h} className="py-3 px-3">
                                  {ls ? (
                                    <span className="inline-block px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-extrabold text-blue-700 dark:text-blue-300 shadow-2xs">
                                      {ls.class_name}{' '}
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        ({ls.subject})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700 font-mono text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherForSchedule(st)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                              >
                                Haftalik Jadval
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Xodimlar Kartochkalari (Cards Grid) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList
                .filter((st) => {
                  if (teacherDayFilter === 'ALL') return true;
                  if (st.role !== 'TEACHER') return true;
                  const dayLessons = st.schedule?.[teacherDayFilter];
                  return Array.isArray(dayLessons) && dayLessons.length > 0;
                })
                .map((st) => {
                  const isTeacher = st.role === 'TEACHER';
                  const isInspector = st.role === 'INSPECTOR';
                  const isDeputy = st.role === 'DEPUTY_DIRECTOR';
                  const isDirector = st.role === 'DIRECTOR';

                  return (
                    <div
                      key={st.id}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col justify-between gap-3 group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xs ${
                              isDirector
                                ? 'bg-gradient-to-tr from-blue-700 to-indigo-600'
                                : isDeputy
                                ? 'bg-purple-600'
                                : isInspector
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {st.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  isDirector
                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                    : isDeputy
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                    : isInspector
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                }`}
                              >
                                {isDirector
                                  ? 'Direktor'
                                  : isDeputy
                                  ? 'Zamdirektor'
                                  : isInspector
                                  ? 'Davomatchi'
                                  : 'Sinf Rahbari'}
                              </span>

                              {st.assigned_class_name && (
                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-md text-[10px] font-extrabold">
                                  {st.assigned_class_name} sinfi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffModal(st);
                              setShowModalPassword(false);
                              setStaffNewPassword('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all"
                            title="Batafsil maʼlumot va parolni ko‘rish"
                          >
                            <span className="material-symbols-outlined text-[19px]">visibility</span>
                          </button>

                          {!isDirector && (
                            <button
                              onClick={() => handleDeleteStaff(st.id, st.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all opacity-0 group-hover:opacity-100"
                              title="Xodimni o‘chirish"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* O'qituvchi Dars Kuni va Dars Jadvali Ko'rinishi */}
                      {isTeacher && (
                        <div className="bg-white dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-blue-600">calendar_month</span>
                              <span>
                                {teacherDayFilter === 'ALL'
                                  ? 'Dars kunlari & Jadvali'
                                  : `${teacherDayFilter} darslari`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedTeacherForSchedule(st)}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              <span>Haftalik jadval</span>
                            </button>
                          </div>

                          {teacherDayFilter !== 'ALL' ? (
                            st.schedule?.[teacherDayFilter] && st.schedule[teacherDayFilter].length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {st.schedule[teacherDayFilter].map((ls: any, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-md text-[10px] font-bold"
                                  >
                                    {ls.hour}-soat: {ls.class_name} ({ls.subject || 'Dars'})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">Bu kuni darsi yo‘q</p>
                            )
                          ) : (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Haftalik dars soati:</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {Object.values(st.schedule || {}).reduce(
                                  (acc: number, arr: any) => acc + (arr?.length || 0),
                                  0
                                )}{' '}
                                soat dars
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono text-[11px] font-semibold">
                            Login: <strong className="text-slate-900 dark:text-white">@{st.username}</strong>
                          </span>

                          {st.phone && (
                            <a
                              href={`tel:${st.phone}`}
                              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                              title="Qo‘ng‘iroq qilish"
                            >
                              <span className="material-symbols-outlined text-[14px]">call</span>
                              <span>{st.phone}</span>
                            </a>
                          )}
                        </div>

                        {/* Parol qatori: ko'zcha bilan ochish/yashirish va batafsil modal */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-slate-400">Parol:</span>
                            <strong className="text-slate-900 dark:text-white font-bold tracking-wider">
                              {cardRevealedPasswords[st.id] ? st.raw_password || 'ustoz123' : '••••••••'}
                            </strong>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCardRevealedPasswords((prev) => ({ ...prev, [st.id]: !prev[st.id] }))
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all"
                              title={cardRevealedPasswords[st.id] ? 'Parolni yashirish' : 'Parolni ko‘rish'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {cardRevealedPasswords[st.id] ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaffModal(st);
                                setShowModalPassword(true);
                                setStaffNewPassword('');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                            >
                              Batafsil
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {/* ================= MODAL: XODIM BATAFSIL & LOGIN-PAROL BOSHQARUVI ================= */}
      {selectedStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md ${
                  selectedStaffModal.role === 'DIRECTOR'
                    ? 'bg-gradient-to-tr from-blue-700 to-indigo-600'
                    : selectedStaffModal.role === 'DEPUTY_DIRECTOR'
                    ? 'bg-purple-600'
                    : selectedStaffModal.role === 'INSPECTOR'
                    ? 'bg-amber-600'
                    : 'bg-emerald-600'
                }`}>
                  {selectedStaffModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {selectedStaffModal.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      selectedStaffModal.role === 'DIRECTOR'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        : selectedStaffModal.role === 'DEPUTY_DIRECTOR'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                        : selectedStaffModal.role === 'INSPECTOR'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {selectedStaffModal.role === 'DIRECTOR'
                        ? 'Direktor'
                        : selectedStaffModal.role === 'DEPUTY_DIRECTOR'
                        ? 'Zamdirektor'
                        : selectedStaffModal.role === 'INSPECTOR'
                        ? 'Davomatchi'
                        : 'Sinf Rahbari'}
                    </span>
                    {selectedStaffModal.assigned_class_name && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-md text-[10px] font-extrabold">
                        {selectedStaffModal.assigned_class_name} sinfi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStaffModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Tizimga Kirish Ma'lumotlari Blok */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <span className="material-symbols-outlined text-[17px]">vpn_key</span>
                  <span>Tizimga Kirish Maʼlumotlari</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Maktab Davomat Tizimi\nF.I.Sh: ${selectedStaffModal.name}\nLogin: @${selectedStaffModal.username}\nParol: ${selectedStaffModal.raw_password || 'ustoz123'}\nSayt: https://maktabim.vercel.app`;
                    handleCopyText(text, 'Barcha login-parol maʼlumotlari');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                  title="Telegramga yuborish uchun barcha ma'lumotlarni nusxalash"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  <span>Telegram uchun nusxalash</span>
                </button>
              </div>

              {/* Login qatori */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Login</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    @{selectedStaffModal.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(`@${selectedStaffModal.username}`, 'Login')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
                  title="Loginni nusxalash"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Nusxa olish</span>
                </button>
              </div>

              {/* Parol qatori: Ko'zcha tugmasi bilan */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Parol</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                    {showModalPassword ? (selectedStaffModal.raw_password || 'ustoz123') : '••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all"
                    title={showModalPassword ? 'Parolni yashirish' : 'Parolni ko‘rish'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showModalPassword ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{showModalPassword ? 'Yashirish' : 'Ko‘rish'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedStaffModal.raw_password || 'ustoz123', 'Parol')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    title="Paroldan nusxa olish"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parolni Yangilash / Tiklash (Reset Password) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-[16px] text-amber-500">lock_reset</span>
                <span>Ustoz parolni unutgan bo‘lsa, yangi parol o‘rnatish:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={staffNewPassword}
                  onChange={(e) => setStaffNewPassword(e.target.value)}
                  placeholder="Yangi parol (masalan: 123456)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={updatingStaffPassword || !staffNewPassword}
                  onClick={() => handleUpdateStaffPassword(selectedStaffModal.id)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap"
                >
                  {updatingStaffPassword ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>

            {/* Aloqa va qo'shimcha ma'lumotlar */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Telefon</span>
                {selectedStaffModal.phone ? (
                  <a href={`tel:${selectedStaffModal.phone}`} className="font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    <span>{selectedStaffModal.phone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 mt-0.5 block">Kiritilmagan</span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Biriktirilgan Sinf</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {selectedStaffModal.assigned_class_name ? `${selectedStaffModal.assigned_class_name} sinfi` : 'Biriktirilmagan'}
                </span>
              </div>
            </div>

            {/* O'qituvchi bo'lsa dars jadvalini ko'rish tugmasi */}
            {selectedStaffModal.role === 'TEACHER' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTeacherForSchedule(selectedStaffModal);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-900 transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                <span>Haftalik To‘liq Dars Jadvalini Ko‘rish</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: O'QITUVCHI HAFTALIK DARS JADVALI ================= */}
      {selectedTeacherForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {selectedTeacherForSchedule.name} — Dars Jadvali
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTeacherForSchedule.assigned_class_name
                      ? `${selectedTeacherForSchedule.assigned_class_name} sinf rahbari`
                      : 'Fan o‘qituvchisi'}{' '}
                    • Haftalik darslari
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacherForSchedule(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Kunlar bo'yicha jadval */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'].map((day) => {
                const lessons = selectedTeacherForSchedule.schedule?.[day] || [];
                return (
                  <div
                    key={day}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {day}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {lessons.length > 0 ? `${lessons.length} ta dars` : 'Dars yo‘q'}
                      </span>
                    </div>

                    {lessons.length > 0 ? (
                      <div className="space-y-1.5">
                        {lessons.map((ls: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
                                {ls.hour}
                              </span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {ls.class_name} sinfi
                              </span>
                              <span className="text-slate-500 text-[11px]">• {ls.subject}</span>
                            </div>
                            {ls.room && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {ls.room}-xona
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1 text-center">
                        Dars rejalashtirilmagan (Bo‘sh kun)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: YANGI XODIM QO'SHISH ================= */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">person_add</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Yangi Xodim Qo‘shish
                  </h3>
                  <p className="text-xs text-slate-400">
                    Xodimga login va parol yaratish
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Xodim F.I.Sh (Ism va Familiya) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Anvar Qodirov"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                    Login (Foydalanuvchi nomi) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="aqodirov"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                    Parol *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="parol123"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                    Lavozimi / Roli *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e: any) => setNewStaffRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  >
                    <option value="TEACHER">Sinf Rahbari (Ustoz)</option>
                    <option value="INSPECTOR">Davomat Mas’uli (Davomatchi)</option>
                    <option value="DEPUTY_DIRECTOR">Zamdirektor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                    Telefon Raqami
                  </label>
                  <input
                    type="text"
                    placeholder="+998901234567"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Faqat Sinf Rahbari bo'lsa sinf tanlash */}
              {newStaffRole === 'TEACHER' && (
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                    Biriktiriladigan Sinf
                  </label>
                  <select
                    value={newStaffClassId}
                    onChange={(e) => setNewStaffClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  >
                    <option value="">Biriktirilmasin (keyinroq tanlanadi)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} sinfi {cls.teacher_name ? `(Hozir: ${cls.teacher_name})` : '(Bo‘sh)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ustoz faqat shu yagona sinfga rahbarlik qiladi
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={staffSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 transition-all"
                >
                  {staffSaving ? 'Saqlanmoqda...' : 'Xodimni Qo‘shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SINF TAFSILOTLARI VA O'QUVCHILAR RO'YXATI ================= */}
      {selectedClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {selectedClassModal.name} Davomat Tafsiloti
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Sinf rahbari: {selectedClassModal.teacher_name || 'Yo‘q'} • Sana: {selectedDate}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAddStudentTargetClassId(selectedClassModal.id);
                    setIsAddStudentOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>+ O‘quvchi qo‘shish</span>
                </button>
                <button
                  onClick={() => setSelectedClassModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 custom-scrollbar">
              {classDetailsLoading ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">Yuklanmoqda...</div>
              ) : classStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">O‘quvchilar topilmadi</div>
              ) : (
                classStudents.map((st: any, idx: number) => {
                  const isPresent = st.status === 'PRESENT';
                  const isAbsent = st.status === 'ABSENT_UNEXCUSED' || st.status === 'ABSENT_EXCUSED';
                  const isLate = st.status === 'LATE';

                  return (
                    <div
                      key={st.student_id || idx}
                      onClick={() =>
                        setSelectedStudentForMonthly({
                          id: st.student_id,
                          name: st.student_name,
                          class_name: selectedClassModal.name,
                        })
                      }
                      className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-blue-500 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                    >
                      {/* Chap / Yuqori: Raqam + F.I.Sh + Ota-ona ma'lumotlari */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-400 flex items-center justify-center tabular-nums shrink-0">
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug">
                            {st.student_name}
                          </p>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-0.5 font-medium truncate">
                            {st.parent_name || 'Ota-ona'} {st.parent_phone && `• ${st.parent_phone}`}
                          </span>
                        </div>
                      </div>

                      {/* O'ng / Pastki: Davomat holati va Amallar (Tahrirlash, O'chirish, Sabab, Taqvim) */}
                      <div
                        className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/60 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Holat nishoni (Bor, Sababli, Kelmagan, Kechikkan) */}
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                            isPresent
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : st.status === 'ABSENT_EXCUSED'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : isAbsent
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {isPresent ? 'Bor' : st.status === 'ABSENT_EXCUSED' ? 'Sababli' : isAbsent ? 'Kelmagan' : 'Kechikkan'}
                        </span>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                          {/* Sababli tugmasi */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForReason(st);
                            }}
                            className={`px-2 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                              st.status === 'ABSENT_EXCUSED'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            title="Sababli deb belgilash"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit_note</span>
                            <span>Sababli</span>
                          </button>

                          {/* Taqvim tugmasi */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForMonthly({
                                id: st.student_id,
                                name: st.student_name,
                                class_name: selectedClassModal.name,
                              });
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Oylik davomat taqvimi"
                          >
                            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          </button>

                          {/* Tahrirlash tugmasi */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStudent({
                                id: st.student_id,
                                name: st.student_name,
                                class_id: selectedClassModal.id,
                                gender: st.gender,
                                parent_name: st.parent_name,
                                parent_phone: st.parent_phone,
                              });
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Tahrirlash"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>

                          {/* O'chirish tugmasi */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(st.student_id, st.student_name);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="O‘chirish"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center">
              O‘quvchi ustiga bosib, uning oylik davomat taqvimini ko‘rishingiz mumkin
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIREKTOR SABABLI BELGILASH ================= */}
      {selectedStudentForReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c121e] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">medical_services</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Sababli deb belgilash
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForReason(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              O‘quvchi: <strong className="text-slate-900 dark:text-white">{selectedStudentForReason.student_name}</strong>
            </p>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Sabab turi *
              </label>
              <select
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                <option value="Kasallik (spravka bor)">Kasallik (spravka bor)</option>
                <option value="Oilaviy sabab">Oilaviy sabab</option>
                <option value="Musobaqa yoki olimpiada">Musobaqa yoki olimpiada</option>
                <option value="Boshqa uzrli sabab">Boshqa uzrli sabab</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                Qo‘shimcha izoh
              </label>
              <textarea
                placeholder="Masalan: 3 kunlik tibbiy maʼlumotnoma taqdim etildi..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white resize-none h-20 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentForReason(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={reasonSaving}
                onClick={handleSaveReasonModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>{reasonSaving ? 'Saqlanmoqda...' : 'Sababli saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: O'QUVCHI OYLIK TAQVIMI (SCREENSHOT DAGIDEK) ================= */}
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
          showToast('Yangi o‘quvchi muvaffaqiyatli qo‘shildi!');
          fetchAllData();
          if (selectedClassModal) {
            handleOpenClassDetails(selectedClassModal);
          }
        }}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        defaultClassId={addStudentTargetClassId}
        schoolId={schoolId}
      />

      {/* ================= MODAL: O'QUVCHINI TAHRIRLASH ================= */}
      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSuccess={(deleted) => {
          showToast(deleted ? 'O‘quvchi muvaffaqiyatli o‘chirildi' : 'O‘quvchi ma’lumotlari yangilandi');
          fetchAllData();
          if (selectedClassModal) {
            handleOpenClassDetails(selectedClassModal);
          }
        }}
        student={editingStudent}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
