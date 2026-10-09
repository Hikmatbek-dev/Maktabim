'use client';

import React, { useState, useEffect } from 'react';
import { DailySchoolStats, SchoolClass } from '@/lib/types';
import { 
  Users, CheckCircle2, XCircle, AlertTriangle, Download, 
  TrendingUp, Clock, Calendar, ArrowUpRight, Search, ShieldAlert, FileSpreadsheet
} from 'lucide-react';

interface DirectorViewProps {
  selectedDate: string;
  schoolId?: string;
}

export function DirectorView({ selectedDate, schoolId }: DirectorViewProps) {
  const [stats, setStats] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filterShift, setFilterShift] = useState<'ALL' | '1' | '2'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const schoolParam = schoolId ? `&school_id=${schoolId}` : '';
        const [statsRes, classesRes] = await Promise.all([
          fetch(`/api/stats?date=${selectedDate}${schoolParam}`),
          fetch(`/api/classes?date=${selectedDate}${schoolParam}`),
        ]);

        const statsData = await statsRes.json();
        const classesData = await classesRes.json();

        setStats(statsData);
        setClasses(classesData.classes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, schoolId]);

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
    if (filterShift === 'ALL') return true;
    return c.shift.toString() === filterShift;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 space-y-6">
      {/* Sarlavha va Excel eksport */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              🎓 Rahbariyat Tahliliy Paneli
            </h1>
            <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full">
              Real-vaqt monitoringi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bugungi umumiy maktab ko‘rsatkichlari, sinflar intizomi va rasmiy hisobotlar
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={downloading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{downloading ? 'Tayyorlanmoqda...' : 'Excel hisobotini yuklab olish'}</span>
        </button>
      </div>

      {/* Asosiy KPI Kartochkalari */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Umumiy foiz */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-blue-500/15 flex flex-col justify-between">
          <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
            Umumiy Davomat
          </span>
          <div className="my-2">
            <div className="text-3xl sm:text-4xl font-black">{stats?.attendance_rate || 0}%</div>
            <div className="text-xs text-blue-100 mt-1">
              {stats?.total_present || 0} / {stats?.total_students || 0} o‘quvchi
            </div>
          </div>
          <div className="w-full bg-blue-800/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.attendance_rate || 0}%` }}
            />
          </div>
        </div>

        {/* Kelganlar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Kelganlar</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats?.total_present || 0}
          </div>
          <span className="text-xs text-emerald-600 font-semibold">Darsda qatnashmoqda</span>
        </div>

        {/* Sababsiz kelmaganlar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Sababsiz</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {stats?.total_absent_unexcused || 0}
          </div>
          <span className="text-xs text-red-500 font-semibold">Xavf ostida</span>
        </div>

        {/* Sababli kelmaganlar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Sababli</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {stats?.total_absent_excused || 0}
          </div>
          <span className="text-xs text-amber-600 font-semibold">Spravka/Tadbir</span>
        </div>

        {/* Topshirgan sinflar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Sinflar Holati</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats?.submitted_classes_count || 0}{' '}
            <span className="text-xs font-normal text-slate-400">/ {stats?.total_classes || 0}</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {stats?.pending_classes_count > 0 ? (
              <span className="text-amber-600 font-bold">{stats.pending_classes_count} sinf topshirmagan</span>
            ) : (
              <span className="text-emerald-600 font-bold">Hammasi topshirgan ✓</span>
            )}
          </span>
        </div>
      </div>

      {/* Smenalar tahlili va Xavf guruhi (2 ustun) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smena taqqoslash kartochkasi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Smenalar taqqoslashi</span>
          </h2>

          {/* 1-smena */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
              <span>1-Smena (Ertalab)</span>
              <span className="text-blue-600">{stats?.shift1_stats?.rate || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${stats?.shift1_stats?.rate || 0}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Jami: {stats?.shift1_stats?.total || 0} o‘quvchi</span>
              <span>Kelgan: {stats?.shift1_stats?.present || 0}</span>
            </div>
          </div>

          {/* 2-smena */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
              <span>2-Smena (Tushdan keyin)</span>
              <span className="text-indigo-600">{stats?.shift2_stats?.rate || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
              <div
                className="bg-indigo-600 h-full rounded-full"
                style={{ width: `${stats?.shift2_stats?.rate || 0}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Jami: {stats?.shift2_stats?.total || 0} o‘quvchi</span>
              <span>Kelgan: {stats?.shift2_stats?.present || 0}</span>
            </div>
          </div>
        </div>

        {/* Xavf guruhi (Surunkali dars qoldiruvchi o'quvchilar) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Xavf Guruhi (Eng ko‘p dars qoldirganlar)</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Nazorat monitoringi</span>
          </div>

          {stats?.risk_students?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {stats.risk_students.map((st: any, i: number) => (
                <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-400 w-4">{i + 1}.</span>
                    <div>
                      <div className="font-bold text-slate-900">{st.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {st.class_name} sinfi • Tel: {st.parent_phone || 'Kiritilmagan'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-black">
                      {st.unexcused_days} kun kelmagan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">
              Ajoyib! Bugungi kunda xavf guruhidagi o‘quvchilar aniqlanmadi.
            </p>
          )}
        </div>
      </div>

      {/* Barcha Sinflar Monitoring Matritsasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sinflar kesimida umumiy jadval</h2>
            <p className="text-xs text-slate-500">Maktabdagi har bir sinfning bugungi ishtiroki</p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
            <button
              onClick={() => setFilterShift('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterShift === 'ALL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Hammasi
            </button>
            <button
              onClick={() => setFilterShift('1')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterShift === '1' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              1-smena
            </button>
            <button
              onClick={() => setFilterShift('2')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterShift === '2' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              2-smena
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sinf</th>
                <th className="py-3 px-4">Smena</th>
                <th className="py-3 px-4">Sinf Rahbari</th>
                <th className="py-3 px-4">O‘quvchilar</th>
                <th className="py-3 px-4">Kelganlar</th>
                <th className="py-3 px-4">Sababsiz</th>
                <th className="py-3 px-4">Sababli</th>
                <th className="py-3 px-4">Davomat %</th>
                <th className="py-3 px-4 text-right">Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredClasses.map((cls) => {
                const isDone = cls.is_submitted;
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">{cls.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{cls.shift}-smena</td>
                    <td className="py-3.5 px-4 text-slate-700">{cls.teacher_name || 'Biriktirilmagan'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{cls.total_students}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{cls.present_count}</td>
                    <td className="py-3.5 px-4 font-bold text-red-600">{cls.unexcused_count}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-600">{cls.excused_count}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 w-8">{cls.percentage}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              cls.percentage >= 90
                                ? 'bg-emerald-500'
                                : cls.percentage >= 75
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${cls.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Topshirilgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ⏳ Topshirilmagan
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
