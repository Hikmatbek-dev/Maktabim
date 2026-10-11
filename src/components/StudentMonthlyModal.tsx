'use client';

import React, { useEffect, useState } from 'react';
import { AttendanceStatus } from '@/lib/types';

interface StudentMonthlyModalProps {
  student: {
    id: string;
    name: string;
    class_name?: string;
  };
  currentDate: string; // e.g. "2026-10-10"
  onClose: () => void;
}

export function StudentMonthlyModal({ student, currentDate, onClose }: StudentMonthlyModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Oy va yilni ajratib olish
  const parsedDate = new Date(currentDate);
  const year = parsedDate.getFullYear();
  const month = parsedDate.getMonth(); // 0-indexed (9 = Oktyabr)

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  const currentMonthName = monthNames[month];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/attendance?student_id=${student.id}`);
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [student.id]);

  // Joriy oydagi kunlar soni
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Oydagi 1-kunning haftadagi o'rni (Dushanba = 1, ..., Yakshanba = 7)
  const firstDayWeekIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 0 for Du, 6 for Ya

  // Sanalar bo'yicha davomat xaritasi
  const attendanceMap: Record<string, AttendanceStatus> = {};
  history.forEach((h) => {
    const dStr = typeof h.date === 'string' ? h.date.split('T')[0] : '';
    if (dStr) {
      attendanceMap[dStr] = h.status as AttendanceStatus;
    }
  });

  // Joriy oydagi hisob-kitoblar (Statistika)
  let keldiCount = 0;
  let kelmadiCount = 0;
  let kechCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = attendanceMap[dayStr];
    if (status === 'PRESENT') keldiCount++;
    else if (status === 'ABSENT_UNEXCUSED' || status === 'ABSENT_EXCUSED') kelmadiCount++;
    else if (status === 'LATE') kechCount++;
  }

  // Kalendar katakchalari
  const calendarDays: Array<{ day: number | null; dateStr: string; status?: AttendanceStatus; isWeekend: boolean }> = [];
  
  // Oldingi oydan qolgan bo'sh joylar
  for (let i = 0; i < firstDayWeekIndex; i++) {
    calendarDays.push({ day: null, dateStr: '', isWeekend: false });
  }

  // Oydagi kunlar
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = (dateObj.getDay() + 6) % 7;
    const isWeekend = dayOfWeek === 6; // Yakshanba
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      day,
      dateStr,
      status: attendanceMap[dateStr],
      isWeekend,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0c121e] text-slate-900 dark:text-white rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Ism, Sinf va Yopish */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {student.name}
            </h3>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900">
              <span className="material-symbols-outlined text-[14px]">school</span>
              {student.class_name || '5-A sinfi'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 1. Oylik statistika (Joriy oy) */}
        <div className="mt-5 space-y-2">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-200">
            Oylik statistika (Joriy oy)
          </h4>
          
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
            {/* Keldi */}
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Keldi</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {loading ? '...' : keldiCount}
              </div>
            </div>

            {/* Kelmadi */}
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Kelmadi</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {loading ? '...' : kelmadiCount}
              </div>
            </div>

            {/* Kech */}
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Kech</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {loading ? '...' : kechCount}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Davomat taqvimi */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-200">
              Davomat taqvimi
            </h4>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {currentMonthName} {year}
            </span>
          </div>

          {/* Hafta kunlari sarlavhasi */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 pb-1">
            <span>Du</span>
            <span>Se</span>
            <span>Ch</span>
            <span>Pa</span>
            <span>Ju</span>
            <span>Sh</span>
            <span className="text-rose-500">Ya</span>
          </div>

          {/* Kalendar Katakchalari */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cd, idx) => {
              if (cd.day === null) {
                return <div key={`empty-${idx}`} className="h-9 sm:h-10" />;
              }

              const isPresent = cd.status === 'PRESENT';
              const isAbsent = cd.status === 'ABSENT_UNEXCUSED' || cd.status === 'ABSENT_EXCUSED';
              const isLate = cd.status === 'LATE';

              // Bugungi sana belgisi
              const isToday = cd.dateStr === currentDate;

              let cellStyle = 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800';
              if (isPresent) {
                cellStyle = 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-black';
              } else if (isAbsent) {
                cellStyle = 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-black';
              } else if (isLate) {
                cellStyle = 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-black';
              } else if (cd.isWeekend) {
                cellStyle = 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-slate-850';
              }

              return (
                <div
                  key={`day-${cd.day}`}
                  className={`h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs transition-all relative tabular-nums ${cellStyle} ${
                    isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-xs' : ''
                  }`}
                  title={`${cd.dateStr}: ${cd.status || (cd.isWeekend ? 'Dam olish kuni' : 'Davomat yo‘q')}`}
                >
                  {cd.day}
                </div>
              );
            })}
          </div>

          {/* Legend / Qaydlar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Kelgan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Kelmagan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Kechikkan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Dam olish</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
