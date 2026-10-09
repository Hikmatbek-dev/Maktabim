'use client';

import React, { useState, useEffect } from 'react';
import { User, School } from '@/lib/types';
import { Navbar } from './Navbar';
import { InspectorView } from './inspector/InspectorView';
import { TeacherView } from './teacher/TeacherView';
import { DirectorView } from './director/DirectorView';
import { AdminView } from './admin/AdminView';

interface DashboardClientProps {
  user: User;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchoolId, setCurrentSchoolId] = useState<string>(
    user.school_id || 'sch_1'
  );
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [selectedDate, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSchoolChange = (schoolId: string) => {
    setCurrentSchoolId(schoolId);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#131B2E] flex flex-col font-sans">
      {/* Yuqori navigatsiya paneli */}
      <Navbar
        user={user}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={handleRefresh}
        schools={schools}
        currentSchoolId={currentSchoolId}
        onSchoolChange={handleSchoolChange}
      />

      {/* Asosiy Rolga xos interfeys */}
      <main className="flex-1" key={`${selectedDate}-${currentSchoolId}-${refreshKey}`}>
        {user.role === 'INSPECTOR' && (
          <InspectorView selectedDate={selectedDate} schoolId={currentSchoolId} />
        )}

        {user.role === 'TEACHER' && (
          <TeacherView user={user} selectedDate={selectedDate} schoolId={currentSchoolId} />
        )}

        {(user.role === 'DIRECTOR' || user.role === 'DEPUTY_DIRECTOR') && (
          <DirectorView selectedDate={selectedDate} schoolId={currentSchoolId} />
        )}

        {user.role === 'SUPER_ADMIN' && (
          <AdminView
            selectedDate={selectedDate}
            currentSchoolId={currentSchoolId}
            onSelectSchool={handleSchoolChange}
          />
        )}
      </main>
    </div>
  );
}
