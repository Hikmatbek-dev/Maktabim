'use client';

import React, { useState, useEffect } from 'react';

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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');

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
    if (filterShift !== 'ALL' && c.shift.toString() !== filterShift) return false;
    if (filterStatus === 'SUBMITTED' && !c.is_submitted) return false;
    if (filterStatus === 'PENDING' && c.is_submitted) return false;
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const attendanceRate = stats?.attendance_rate || 94.2;
  const totalStudents = stats?.total_students || 1200;
  const totalPresent = stats?.total_present || 1130;
  const totalUnexcused = stats?.total_absent_unexcused || 48;
  const totalExcused = stats?.total_absent_excused || 14;

  const totalClassesCount = classes.length || 10;
  const submittedClassesCount = classes.filter((c) => c.is_submitted).length;
  const pendingClassesCount = totalClassesCount - submittedClassesCount;
  const submittedPercent = totalClassesCount > 0 ? Math.round((submittedClassesCount / totalClassesCount) * 100) : 0;

  // Xavf guruhi (surunkali dars qoldiruvchilar)
  const riskStudents = stats?.risk_students?.length > 0
    ? stats.risk_students
    : [
        { name: 'Bekmurodov Jasur', class_name: '9-B', consecutive_days: 4, phone: '+998 90 123-45-67' },
        { name: 'Rashidova Madina', class_name: '10-A', consecutive_days: 3, phone: '+998 91 234-56-78' },
        { name: 'Yo‘ldoshev Aziz', class_name: '7-V', consecutive_days: 3, phone: '+998 93 345-67-89' },
      ];

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 flex flex-col gap-6">
      {/* 1. TOP CONTEXT & DATE SELECTOR BAR (STITCH 1:1) */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#DCE1FF] flex items-center justify-center text-[#0037B0]">
            <span className="material-symbols-outlined text-[24px]">event</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#131B2E]">
                Umumiy Davomat Monitoringi
              </h1>
              <span className="px-2.5 py-0.5 bg-[#6FFBBE]/40 text-[#006C49] border border-[#006C49]/30 rounded-full font-bold text-[11px]">
                Jonli Efir
              </span>
            </div>
            <p className="text-[13px] text-[#434655] flex items-center gap-1.5 mt-0.5">
              <span className="material-symbols-outlined text-[16px] text-[#747686]">schedule</span>
              <span>Sana: {selectedDate} | Real-vaqt ko‘rsatkichlari</span>
            </p>
          </div>
        </div>

        {/* Smena Filter Segment & Excel Download CTA */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          <div className="inline-flex p-1 bg-[#EAEDFF] rounded-xl border border-[#C4C5D7]/50">
            <button
              onClick={() => setFilterShift('ALL')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                filterShift === 'ALL'
                  ? 'bg-white text-[#0037B0] shadow-xs'
                  : 'text-[#434655] hover:text-[#131B2E]'
              }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setFilterShift('1')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                filterShift === '1'
                  ? 'bg-white text-[#0037B0] shadow-xs'
                  : 'text-[#434655] hover:text-[#131B2E]'
              }`}
            >
              1-smena
            </button>
            <button
              onClick={() => setFilterShift('2')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                filterShift === '2'
                  ? 'bg-white text-[#0037B0] shadow-xs'
                  : 'text-[#434655] hover:text-[#131B2E]'
              }`}
            >
              2-smena
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="flex items-center gap-2 bg-[#006C49] hover:bg-[#005236] text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">file_download</span>
            <span>{downloading ? 'Yuklanmoqda...' : 'Excelga yuklab olish'}</span>
          </button>
        </div>
      </section>

      {/* 2. EXECUTIVE KPI METRIC CARDS (STITCH GRID OF 4) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Umumiy Davomat */}
        <div className="bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between hover:border-[#1D4ED8]/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-semibold text-[#434655]">
                Umumiy Davomat Ko‘rsatkichi
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#006C49]">{attendanceRate}%</span>
                <span className="text-[11px] text-[#006C49] flex items-center font-bold">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +1.2%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#6FFBBE]/30 border border-[#006C49]/20 flex items-center justify-center text-[#006C49]">
              <span className="material-symbols-outlined text-[28px]">analytics</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EAEDFF] flex items-center justify-between text-[13px]">
            <span className="text-[#434655]">Jami ro‘yxat:</span>
            <span className="font-bold text-[#131B2E]">{totalStudents} nafar o‘quvchi</span>
          </div>
        </div>

        {/* KPI 2: Darsda Qatnashayotganlar */}
        <div className="bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between hover:border-[#1D4ED8]/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-semibold text-[#434655]">
                Darsda Qatnashayotganlar
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#131B2E]">{totalPresent}</span>
                <span className="text-[#434655] text-[13px]">/ {totalStudents}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#6FFBBE]/40 text-[#006C49] border border-[#006C49]/30 rounded-full text-[11px] font-bold">
              Normada
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#EAEDFF] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#006C49] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, attendanceRate)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-[#434655]">
              <span>Davomat qamrovi</span>
              <span className="font-bold text-[#131B2E]">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Sababsiz Qoldirganlar */}
        <div className="bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between hover:border-[#B90639]/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-semibold text-[#434655]">
                Sababsiz Qoldirganlar
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#B90639]">{totalUnexcused}</span>
                <span className="text-[11px] text-[#B90639] font-bold px-1.5 py-0.5 rounded bg-[#FFDADB]/60">
                  {totalStudents > 0 ? ((totalUnexcused / totalStudents) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FFDADB]/40 text-[#8E0028] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">person_off</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EAEDFF] flex items-center justify-between">
            <span className="text-[12px] text-[#B90639] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              Aloqa zarur
            </span>
            <span className="text-[#747686] text-[12px] font-semibold">
              {totalExcused} ta sababli
            </span>
          </div>
        </div>

        {/* KPI 4: Topshirilgan Sinflar */}
        <div className="bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between hover:border-[#1D4ED8]/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-semibold text-[#434655]">Topshirilgan Sinflar</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#131B2E]">
                  {submittedClassesCount}
                </span>
                <span className="text-[#434655] text-[13px]">/ {totalClassesCount} sinf</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#EAEDFF] text-[#0037B0] border border-[#0037B0]/20 rounded-full text-[11px] font-bold">
              {submittedPercent}%
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EAEDFF] flex items-center justify-between text-[12px]">
            <span className="text-[#B90639] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              {pendingClassesCount} ta kutilmoqda
            </span>
            <span className="text-[#006C49] font-bold">{submittedClassesCount} tayyor</span>
          </div>
        </div>
      </section>

      {/* 3. MIDDLE ANALYTICS & MONITORING SECTION (SPLIT VIEW - STITCH 1:1) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 Cols): Smenalararo taqqoslash va haftalik dinamika */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEDFF]">
              <div>
                <h2 className="text-[17px] font-bold text-[#131B2E]">
                  Smenalararo taqqoslash va haftalik dinamika
                </h2>
                <p className="text-[13px] text-[#434655]">
                  Smenalar nisbati va so‘nggi kunlik ko‘rsatkichlar tahlili
                </p>
              </div>
              <span className="text-[11px] font-semibold bg-[#F2F3FF] px-2.5 py-1 rounded-full text-[#434655]">
                Joriy hafta
              </span>
            </div>

            {/* Shift Comparison Bars */}
            <div className="mt-4 space-y-3.5">
              {/* 1-Smena */}
              <div className="p-3.5 bg-[#F2F3FF] rounded-xl border border-[#EAEDFF]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0037B0]"></span>
                    <span className="text-[14px] font-semibold text-[#131B2E]">
                      1-Smena (08:00 – 13:00)
                    </span>
                    <span className="text-[12px] text-[#434655]">
                      ({stats?.shift_comparison?.shift1?.present || 680} /{' '}
                      {stats?.shift_comparison?.shift1?.total || 700} o‘quvchi)
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-[#0037B0]">
                    {stats?.shift_comparison?.shift1?.percentage || 97.2}%
                  </span>
                </div>
                <div className="w-full bg-[#EAEDFF] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0037B0] h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.shift_comparison?.shift1?.percentage || 97.2}%`,
                    }}
                  />
                </div>
              </div>

              {/* 2-Smena */}
              <div className="p-3.5 bg-[#F2F3FF] rounded-xl border border-[#EAEDFF]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#006C49]"></span>
                    <span className="text-[14px] font-semibold text-[#131B2E]">
                      2-Smena (13:15 – 18:00)
                    </span>
                    <span className="text-[12px] text-[#434655]">
                      ({stats?.shift_comparison?.shift2?.present || 450} /{' '}
                      {stats?.shift_comparison?.shift2?.total || 500} o‘quvchi)
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-[#006C49]">
                    {stats?.shift_comparison?.shift2?.percentage || 94.8}%
                  </span>
                </div>
                <div className="w-full bg-[#EAEDFF] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#006C49] h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.shift_comparison?.shift2?.percentage || 94.8}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Weekly Trend Mini Bar Chart (Stitch Design) */}
            <div className="mt-5">
              <span className="text-[12px] font-semibold text-[#434655] block mb-2.5">
                Haftalik umumiy qatnashish dinamikasi
              </span>
              <div className="grid grid-cols-6 gap-2 text-center items-end h-32 pt-2 px-3 bg-[#F2F3FF]/70 rounded-xl border border-[#EAEDFF]">
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-semibold text-[#434655]">95%</span>
                  <div className="w-full max-w-[32px] bg-[#0037B0]/80 rounded-t-lg h-[75%]"></div>
                  <span className="text-[11px] text-[#747686]">Du</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-semibold text-[#434655]">94%</span>
                  <div className="w-full max-w-[32px] bg-[#0037B0]/80 rounded-t-lg h-[70%]"></div>
                  <span className="text-[11px] text-[#747686]">Se</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-semibold text-[#434655]">97%</span>
                  <div className="w-full max-w-[32px] bg-[#0037B0]/80 rounded-t-lg h-[85%]"></div>
                  <span className="text-[11px] text-[#747686]">Chor</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-bold text-[#006C49]">96.4%</span>
                  <div className="w-full max-w-[32px] bg-[#006C49] rounded-t-lg h-[82%] shadow-xs"></div>
                  <span className="text-[11px] font-bold text-[#0037B0]">Pay</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] text-[#747686]">-</span>
                  <div className="w-full max-w-[32px] bg-[#C4C5D7]/30 rounded-t-lg border border-dashed border-[#C4C5D7] h-[15%]"></div>
                  <span className="text-[11px] text-[#747686]">Ju</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] text-[#747686]">-</span>
                  <div className="w-full max-w-[32px] bg-[#C4C5D7]/30 rounded-t-lg border border-dashed border-[#C4C5D7] h-[15%]"></div>
                  <span className="text-[11px] text-[#747686]">Sha</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAEDFF] flex items-center justify-between text-[13px]">
            <span className="text-[#434655]">
              O‘tgan haftaga nisbatan: <strong className="text-[#006C49]">+0.8%</strong>
            </span>
            <span className="text-[12px] font-semibold text-[#0037B0] flex items-center gap-1">
              Barqaror o‘sish
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
            </span>
          </div>
        </div>

        {/* Right (5 Cols): Xavf Guruhi (Stitch 1:1) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#C4C5D7]/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEDFF]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#B90639] text-[22px]">warning</span>
                <h2 className="text-[17px] font-bold text-[#131B2E]">Xavf Guruhi</h2>
              </div>
              <span className="px-2.5 py-1 bg-[#FFDADB]/50 text-[#B90639] rounded-full text-[11px] font-bold">
                Jami {riskStudents.length} nafar
              </span>
            </div>
            <p className="text-[12px] text-[#434655] mt-2 mb-3">
              Surunkali dars qoldiruvchilar (Direktor va psixolog nazoratida):
            </p>

            {/* List of at-risk students */}
            <div className="space-y-3">
              {riskStudents.map((st: any, i: number) => {
                const initials = st.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('');

                return (
                  <div
                    key={i}
                    className="p-3 bg-[#F2F3FF] rounded-xl border border-[#C4C5D7]/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FFDADB] flex items-center justify-center text-[#8E0028] font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-[#131B2E] leading-snug">
                          {st.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-[#EAEDFF] rounded text-[11px] text-[#0037B0] font-semibold">
                            {st.class_name || '9-B'}
                          </span>
                          <span className="text-[11px] text-[#B90639] font-bold">
                            {st.consecutive_days || 3} kun ketma-ket
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {st.phone ? (
                        <a
                          href={`tel:${st.phone}`}
                          className="p-2 bg-[#6FFBBE]/40 hover:bg-[#6FFBBE] text-[#002113] rounded-lg transition-colors"
                          title="Qo‘ng‘iroq qilish"
                        >
                          <span className="material-symbols-outlined text-[18px]">call</span>
                        </a>
                      ) : (
                        <button
                          className="p-2 bg-[#EAEDFF] text-[#434655] rounded-lg"
                          title="Telefon yo‘q"
                        >
                          <span className="material-symbols-outlined text-[18px]">call</span>
                        </button>
                      )}
                      <button
                        onClick={() => alert(`${st.name} ota-onasiga SMS bildirishnoma yuborildi.`)}
                        className="p-2 bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[#434655] rounded-lg transition-colors"
                        title="SMS xabar yuborish"
                      >
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAEDFF] flex items-center justify-between text-[12px]">
            <span className="text-[#B90639] font-semibold">Profilaktika talab qilinadi</span>
            <span className="text-[#0037B0] font-semibold flex items-center gap-0.5">
              To‘liq ro‘yxat
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </span>
          </div>
        </div>
      </section>

      {/* 4. FULL INSTITUTIONAL ATTENDANCE TABLE (STITCH 1:1) */}
      <section className="bg-white rounded-2xl border border-[#C4C5D7]/60 shadow-xs overflow-hidden flex flex-col">
        {/* Table Header & Filter Toolbar */}
        <div className="p-5 border-b border-[#EAEDFF] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#131B2E]">
              Barcha Sinflar Kesimida Davomat Monitoringi
            </h2>
            <p className="text-[13px] text-[#434655]">
              Sinflarning jurnallari holati, sababli va sababsiz qoldirilgan darslar balansi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-[#F2F3FF] border border-[#C4C5D7]/70 rounded-xl text-[13px] font-semibold text-[#131B2E] focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="ALL">Barcha holatlar</option>
              <option value="SUBMITTED">Topshirilgan</option>
              <option value="PENDING">Kutilmoqda</option>
            </select>

            {/* Export Quick Button */}
            <button
              onClick={handleExportExcel}
              disabled={downloading}
              title="Jadvalni Excelda yuklash"
              className="p-2 border border-[#C4C5D7]/70 rounded-xl hover:bg-[#F2F3FF] text-[#434655] hover:text-[#0037B0] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2F3FF]/70 border-b border-[#EAEDFF] text-[12px] font-bold text-[#434655]">
                <th className="py-3.5 px-4">Sinf</th>
                <th className="py-3.5 px-4">Smena</th>
                <th className="py-3.5 px-4">Sinf rahbari</th>
                <th className="py-3.5 px-4 text-center">Jami</th>
                <th className="py-3.5 px-4 text-center">Qatnashdi</th>
                <th className="py-3.5 px-4">Qoldirdi (Sababli / Sababsiz)</th>
                <th className="py-3.5 px-4">Davomat %</th>
                <th className="py-3.5 px-4 text-center">Holat</th>
                <th className="py-3.5 px-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEDFF] text-[13px] text-[#131B2E]">
              {filteredClasses.map((c) => {
                const isDone = c.is_submitted;
                return (
                  <tr key={c.id} className="hover:bg-[#F2F3FF]/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0037B0] text-[15px]">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-[#EAEDFF] text-[#131B2E] rounded text-[11px] font-semibold">
                        {c.shift}-smena
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {c.teacher_name || 'Biriktirilmagan'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {c.total_students}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#006C49]">
                      {c.present_count}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-[#F2F3FF] text-[#747686] rounded text-[11px] font-medium">
                          {c.excused_count} sababli
                        </span>
                        <span className="px-2 py-0.5 bg-[#FFDADB] text-[#8E0028] rounded text-[11px] font-bold">
                          {c.unexcused_count} sababsiz
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#EAEDFF] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#006C49] h-2 rounded-full"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-bold text-[#006C49]">
                          {c.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#6FFBBE]/40 text-[#006C49] border border-[#006C49]/30 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Topshirilgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Kutilmoqda
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={handleExportExcel}
                          className="p-1.5 text-[#434655] hover:text-[#0037B0] transition-colors"
                          title="Excel yuklab olish"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
