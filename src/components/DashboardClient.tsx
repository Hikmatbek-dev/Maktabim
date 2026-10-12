'use client';

import React, { useState, useEffect } from 'react';
import { User, School } from '@/lib/types';
import { Sidebar, NavSection } from './Sidebar';
import { InspectorView } from './inspector/InspectorView';
import { TeacherView } from './teacher/TeacherView';
import { DirectorView } from './director/DirectorView';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
  user: User;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchoolId, setCurrentSchoolId] = useState<string>(
    user.school_id || 'sch_1'
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check saved theme or system preference
    const saved = localStorage.getItem('maktabim_theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('maktabim_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('maktabim_theme', 'light');
      }
      return next;
    });
  };

  // Standart bo'limni foydalanuvchi roliga qarab aniqlash
  const [activeSection, setActiveSection] = useState<NavSection>(() => {
    if (user.role === 'INSPECTOR') return 'inspector_classes';
    if (user.role === 'TEACHER') return 'teacher_attendance';
    return 'director_summary';
  });

  // Maktablar ro'yxatini yuklash
  const loadSchools = async () => {
    try {
      const res = await fetch(`/api/schools?date=${selectedDate}`);
      const data = await res.json();
      if (data.schools && data.schools.length > 0) {
        setSchools(data.schools);
        if (!currentSchoolId || !data.schools.find((s: School) => s.id === currentSchoolId)) {
          setCurrentSchoolId(user.school_id || data.schools[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  useEffect(() => {
    loadSchools();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSchoolChange = (schoolId: string) => {
    setCurrentSchoolId(schoolId);
  };

  const getSectionTitle = (section: NavSection) => {
    switch (section) {
      case 'director_summary': return 'Maktab bo‘yicha kunlik xulosa';
      case 'classes': return 'Sinflar Jurnali va Arxiv';
      case 'attendance_reports': return 'Davomat Tahlili va Hisobotlar';
      case 'staff': return 'Maktab Xodimlari va Rollar';
      case 'inspector_monitor': return 'Tezkor Smena Monitoringi';
      case 'inspector_classes': return 'Sinflar Davomat Yo‘qlamasi';
      case 'teacher_monitor': return 'Sinf Davomat Statistikasi';
      case 'teacher_attendance': return 'Sinf Jurnali va Yo‘qlama';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* 1. Chap tomon: Asosiy Navigatsiya Sidebari */}
      <Sidebar
        user={user}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={handleRefresh}
        schools={schools}
        currentSchoolId={currentSchoolId}
        onSchoolChange={handleSchoolChange}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* 2. O'ng tomon: Asosiy Tarkib Maydoni */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Yuqori Executive Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between transition-colors shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
              title="Menyuni ochish"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {getSectionTitle(activeSection)}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                  {user.role === 'DIRECTOR' ? 'Direktor' : user.role === 'INSPECTOR' ? 'Davomatchi' : 'Sinf Rahbari'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block mt-0.5">
                Sana: <strong className="text-slate-700 dark:text-slate-300">{selectedDate}</strong> • {schools.find((s) => s.id === currentSchoolId)?.name || 'Urganch tuman 3-maktab'}
              </span>
            </div>
          </div>

          {/* O'ng tomon: Tungi Rejim va Yangilash */}
          <div className="flex items-center gap-2">
            {/* Dark mode button in header */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? 'Kunduzgi rejim' : 'Tungi rejim'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-amber-500">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              onClick={handleRefresh}
              title="Yangilash"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>
        </header>

        {/* Asosiy Dinamik Bo'lim Mazmuni */}
        <main className="flex-1 p-3 sm:p-6" key={`${selectedDate}-${currentSchoolId}-${refreshKey}`}>
          {/* Direktor bo'limlari */}
          {(activeSection === 'director_summary' ||
            activeSection === 'classes' ||
            activeSection === 'attendance_reports' ||
            activeSection === 'staff') && (
            <DirectorView
              selectedDate={selectedDate}
              schoolId={currentSchoolId}
              activeTab={activeSection as any}
            />
          )}

          {/* Davomatchi bo'limlari */}
          {(activeSection === 'inspector_monitor' || activeSection === 'inspector_classes') && (
            <InspectorView
              selectedDate={selectedDate}
              schoolId={currentSchoolId}
              activeTab={activeSection as any}
            />
          )}

          {/* Ustoz (Sinf rahbari) bo'limlari */}
          {(activeSection === 'teacher_monitor' || activeSection === 'teacher_attendance') && (
            <TeacherView
              user={user}
              selectedDate={selectedDate}
              schoolId={currentSchoolId}
              activeTab={activeSection as any}
            />
          )}
        </main>
      </div>
    </div>
  );
}
