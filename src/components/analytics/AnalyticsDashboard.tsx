'use client';

import React, { useState, useEffect } from 'react';

interface AnalyticsDashboardProps {
  role: 'DIRECTOR' | 'DEPUTY_DIRECTOR' | 'INSPECTOR' | 'TEACHER';
  selectedDate: string;
  schoolId?: string;
  classId?: string;
  className?: string;
  classes?: Array<{ id: string; name: string; grade?: number }>;
  onSelectStudentMonthly?: (student: { id: string; name: string; class_name?: string }) => void;
}

export function AnalyticsDashboard({
  role,
  selectedDate,
  schoolId,
  classId: propClassId,
  className: propClassName,
  classes = [],
  onSelectStudentMonthly,
}: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedClassId, setSelectedClassId] = useState<string>(propClassId || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Sync propClassId
  useEffect(() => {
    if (propClassId) {
      setSelectedClassId(propClassId);
    }
  }, [propClassId]);

  // Load analytics
  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          period,
          school_id: schoolId || 'sch_1',
        });
        if (selectedClassId) {
          params.append('class_id', selectedClassId);
        }
        const res = await fetch(`/api/analytics?${params.toString()}`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, period, schoolId, selectedClassId]);

  const currentRate = data?.attendance_rate ?? 0;
  const timeline = data?.timeline || [];
  const weekdays = data?.weekdays_analysis?.days || [];
  const bestDay = data?.weekdays_analysis?.best_day || 'Seshanba (96%)';
  const worstDay = data?.weekdays_analysis?.worst_day || 'Shanba (88%)';
  const rankings = data?.rankings || {};
  const reasons = data?.reasons_breakdown || [];

  return (
    <div className="space-y-6 font-sans">
      {/* ================= 1. HEADER & PERIOD SWITCHER ================= */}
      <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <span className="material-symbols-outlined text-[22px]">monitoring</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Davomat Tahlili va Grafik Statistikasi
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60">
                  {period === 'daily' ? 'Kunlik' : period === 'weekly' ? 'Haftalik' : period === 'monthly' ? 'Oylik' : 'Yillik'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {selectedClassId
                  ? `${classes.find((c) => c.id === selectedClassId)?.name || propClassName || 'Sinf'} ko‘rsatkichlari dinamikasi`
                  : 'Maktab bo‘yicha to‘liq davomat va intizom ko‘rsatkichlari'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Class Selector (if Director/Inspector) & Period Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Sinf tanlash dropdowni (faqat direktor va inspektor uchun) */}
          {role !== 'TEACHER' && classes.length > 0 && (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 pr-8"
              >
                <option value="">Barcha Sinflar (Maktab)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} sinfi
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Pills: Kunlik, Haftalik, Oylik, Yillik */}
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                period === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kunlik
            </button>
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                period === 'weekly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Haftalik
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                period === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Oylik
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                period === 'yearly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yillik
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. EXECUTIVE KPI CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Davomat Foizi */}
        <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              O‘rtacha Davomat
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {currentRate}%
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md flex items-center">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              <span>+2.4%</span>
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${currentRate}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Kelganlar */}
        <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Kelganlar</span>
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {data?.present_count ?? 0}
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-1">
            {data?.total_students ? `${data.total_students} o‘quvchidan` : 'faol darsda'}
          </span>
        </div>

        {/* KPI 3: Sababsiz Qoldirilgan */}
        <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            <span>Sababsiz</span>
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {data?.unexcused_count ?? 0}
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-1">
            {(data?.unexcused_count ?? 0) * 6} soat dars boy berildi
          </span>
        </div>

        {/* KPI 4: Sababli (Spravka / Uzrli) */}
        <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
            <span>Sababli</span>
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {data?.excused_count ?? 0}
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-1">
            Spravka & maʼlumotnoma
          </span>
        </div>

        {/* KPI 5: Kechikkanlar */}
        <div className="bg-white dark:bg-[#0c121e] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>Kechikkan</span>
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
            {data?.late_count ?? 0}
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-1">
            Qo‘ng‘iroqdan so‘ng
          </span>
        </div>
      </div>

      {/* ================= 3. ASOSIY GRAFIK: DAVOMAT DINAMIKASI (INTERACTIVE BAR CHART) ================= */}
      <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">bar_chart</span>
              <span>
                {period === 'daily'
                  ? 'Kunlik Paralellar Kesimida Davomat'
                  : period === 'weekly'
                  ? 'Haftalik Davomat Dinamikasi (Kunlar Kesimida)'
                  : period === 'monthly'
                  ? 'Joriy Oy Davomat Dinamikasi'
                  : 'O‘quv Yili Oylik Davomat Dinamikasi'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ustun ustiga sichqonchani olib boring — aniq sonlar va ko‘rsatkichlar ko‘rinadi
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-extrabold">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-md bg-gradient-to-t from-blue-600 to-indigo-500 inline-block"></span>
              <span>Davomat %</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-rose-500 inline-block"></span>
              <span>95% Maqsad</span>
            </span>
          </div>
        </div>

        {/* Bar Chart Container */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            <span>Grafik yuklanmoqda...</span>
          </div>
        ) : timeline.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2">
            <span className="material-symbols-outlined text-[36px] text-slate-300">leaderboard</span>
            <span>Ushbu davr uchun davomat ma’lumotlari topilmadi</span>
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            {/* Target 95% Benchmark Line */}
            <div className="absolute left-0 right-0 top-[25%] border-b border-dashed border-rose-400/60 z-0 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-white/90 dark:bg-[#0c121e]/90 px-1 rounded">
                95% Maqsad
              </span>
            </div>

            {/* Hover Tooltip Popup */}
            {hoveredPoint && (
              <div
                className="absolute z-20 bg-slate-900 text-white text-xs rounded-2xl p-3 shadow-2xl border border-slate-700 pointer-events-none transition-all duration-150 animate-in fade-in"
                style={{
                  left: `${Math.min(Math.max(hoveredPoint.x, 15), 85)}%`,
                  top: '10px',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-black text-sm text-blue-400 border-b border-slate-700/80 pb-1 mb-1.5">
                  {hoveredPoint.data.label || hoveredPoint.data.dayName}
                </div>
                <div className="space-y-1 text-[11px] font-semibold">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-300">Davomat foizi:</span>
                    <span className="font-extrabold text-emerald-400">{hoveredPoint.data.rate}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-300">Kelgan:</span>
                    <span className="font-bold text-white">{hoveredPoint.data.present} ta</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-300">Sababsiz:</span>
                    <span className="font-bold text-rose-400">{hoveredPoint.data.unexcused} ta</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-300">Sababli:</span>
                    <span className="font-bold text-amber-400">{hoveredPoint.data.excused} ta</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bars Flex Grid */}
            <div className="h-64 flex items-end gap-2 sm:gap-4 relative z-10 px-2">
              {timeline.map((point: any, idx: number) => {
                const heightPercent = Math.max(point.rate, 6);
                const isUpcoming = point.status === 'upcoming';
                const isHigh = point.rate >= 95;
                const isLow = point.rate > 0 && point.rate < 90;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      const itemRect = e.currentTarget.getBoundingClientRect();
                      if (rect) {
                        const x = ((itemRect.left + itemRect.width / 2 - rect.left) / rect.width) * 100;
                        setHoveredPoint({ data: point, x });
                      }
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Rate pill on top of bar */}
                    {!isUpcoming && point.rate > 0 && (
                      <span
                        className={`text-[10px] sm:text-[11px] font-black mb-1.5 transition-all tabular-nums ${
                          isHigh
                            ? 'text-emerald-600 dark:text-emerald-400 group-hover:scale-110'
                            : isLow
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {point.rate}%
                      </span>
                    )}

                    {/* The Visual Bar */}
                    <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 flex flex-col justify-end h-44 overflow-hidden group-hover:ring-2 group-hover:ring-blue-500/40 transition-all">
                      {isUpcoming ? (
                        <div className="w-full h-full border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-400 rotate-90 sm:rotate-0">Reja</span>
                        </div>
                      ) : (
                        <div
                          className={`w-full rounded-xl transition-all duration-500 shadow-sm ${
                            isHigh
                              ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400'
                              : isLow
                              ? 'bg-gradient-to-t from-rose-600 via-amber-500 to-rose-400'
                              : 'bg-gradient-to-t from-blue-700 via-indigo-600 to-blue-500'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      )}
                    </div>

                    {/* Bottom Label */}
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mt-2 truncate max-w-full text-center">
                      {point.shortLabel || point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. HAFTA KUNLARI TAHLILI & SABABLAR ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hafta Kunlari Bo'yicha Tahlil (Dushanba - Shanba) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">calendar_view_week</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Hafta Kunlari Bo‘yicha O‘rtacha Davomat
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                Semestr Tahlili
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4 font-medium">
              O‘quvchilar ko‘proq qaysi kunlari darsga to‘liq qatnashishi yoki qoldirishi tahlili:
            </p>

            {/* Weekdays Bar List */}
            <div className="space-y-3">
              {weekdays.map((day: any) => {
                const isWorst = day.dayName === worstDay.split(' ')[0];
                const isBest = day.dayName === bestDay.split(' ')[0];

                return (
                  <div key={day.dayNum} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-16 font-extrabold text-slate-900 dark:text-white">{day.dayName}</span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-black">
                            🏆 Eng faol
                          </span>
                        )}
                        {isWorst && (
                          <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded text-[9px] font-black">
                            ⚠️ Eng past
                          </span>
                        )}
                      </span>
                      <span
                        className={`tabular-nums font-black ${
                          isBest
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isWorst
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {day.rate}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isBest
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : isWorst
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                        }`}
                        style={{ width: `${day.rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Highlights summary */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Eng namunali kun: <strong>{bestDay}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              <span>Ko‘p dars qoldirilgan: <strong>{worstDay}</strong></span>
            </div>
          </div>
        </div>

        {/* Sabablar Taqsimoti (Absence Reasons Breakdown) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">pie_chart</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Dars Qoldirish Sabablari
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                Spravka & Uzr
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4 font-medium">
              Uzrli dars qoldirgan o‘quvchilar taqdim etgan hujjatlar:
            </p>

            <div className="space-y-3.5">
              {reasons.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  Sabablar maʼlumoti mavjud emas
                </div>
              ) : (
                reasons.map((r: any, idx: number) => {
                  const totalReasons = reasons.reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;
                  const pct = Math.round((r.count / totalReasons) * 100);
                  const colors = [
                    'bg-amber-500',
                    'bg-blue-500',
                    'bg-purple-500',
                    'bg-emerald-500',
                    'bg-teal-500',
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate pr-2">
                          {r.label}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                          {r.count} ta ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
            Tibbiy ma’lumotnomalar direktor va inspektor tomonidan tasdiqlanadi
          </div>
        </div>
      </div>

      {/* ================= 5. REYTING & LEADERBOARD (POINT 5) ================= */}
      {/* If School-level (Director / Inspector): Top 5 and Bottom 5 Classes */}
      {!selectedClassId && rankings.top_classes && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top 5 Namunali Sinflar */}
          <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Eng Namunali Sinflar (Top 5)
                  </h3>
                  <p className="text-xs text-slate-400">Maktab bo‘yicha eng yuqori davomatga ega sinflar</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Namunali
              </span>
            </div>

            <div className="space-y-2.5">
              {rankings.top_classes.map((cls: any, idx: number) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 hover:border-emerald-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-base font-black w-6 text-center shrink-0">{medal}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {cls.name} sinfi
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {cls.shift}-smena
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block mt-0.5 font-medium">
                          Rahbar: {cls.teacher_name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {cls.rate}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">davomat</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom 5: E'tibor Talab Qiluvchi Sinflar */}
          <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    E’tibor Talab Qiladigan Sinflar
                  </h3>
                  <p className="text-xs text-slate-400">Davomati past va nazorat kuchaytirilishi kerak</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                Nazoratda
              </span>
            </div>

            <div className="space-y-2.5">
              {rankings.bottom_classes.map((cls: any, idx: number) => {
                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className="p-3.5 rounded-2xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                            {cls.name} sinfi
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {cls.shift}-smena
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block mt-0.5 font-medium">
                          Rahbar: {cls.teacher_name} • {cls.unexcused_count} ta dars qoldirilgan
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {cls.rate}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">davomat</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* If Class-level (Teacher or filtered to a class): Student Discipline Leaderboard */}
      {selectedClassId && rankings.top_students && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Namunali O'quvchilar */}
          <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    100% va Namunali Qatnashuvchilar
                  </h3>
                  <p className="text-xs text-slate-400">Sinfning eng intizomli o‘quvchilari</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {rankings.top_students.length} nafar
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {rankings.top_students.map((st: any, idx: number) => (
                <div
                  key={st.id}
                  onClick={() =>
                    onSelectStudentMonthly &&
                    onSelectStudentMonthly({ id: st.id, name: st.name, class_name: propClassName })
                  }
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-emerald-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-6 text-center font-black text-xs text-slate-400 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                        {st.name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {st.present_days} kun to‘liq qatnashgan
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs tabular-nums">
                    {st.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Xavf Guruhi va Ko'p dars qoldirganlar */}
          <div className="bg-white dark:bg-[#0c121e] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">warning</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ko‘p Dars Qoldirgan O‘quvchilar
                  </h3>
                  <p className="text-xs text-slate-400">Ota-onasi bilan bog‘lanish va chora ko‘rish tavsiya etiladi</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                {rankings.risk_students?.length || 0} nafar
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {!rankings.risk_students || rankings.risk_students.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  Sinfda ko‘p dars qoldirgan o‘quvchilar yo‘q
                </div>
              ) : (
                rankings.risk_students.map((st: any, idx: number) => (
                  <div
                    key={st.id}
                    onClick={() =>
                      onSelectStudentMonthly &&
                      onSelectStudentMonthly({ id: st.id, name: st.name, class_name: propClassName })
                    }
                    className="p-3 rounded-2xl border border-rose-200/60 dark:border-rose-950/40 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 text-center font-black text-xs text-rose-500 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                          {st.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Tel: {st.parent_phone || 'Kiritilmagan'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black text-xs tabular-nums">
                        {st.missed_hours} soat
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                        {st.unexcused_days} kun
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
