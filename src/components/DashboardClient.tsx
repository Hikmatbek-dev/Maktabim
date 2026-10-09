'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
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
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Yuqori navigatsiya paneli */}
      <Navbar
        user={user}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={handleRefresh}
      />

      {/* Asosiy Rolga xos interfeys */}
      <main className="flex-1" key={`${selectedDate}-${refreshKey}`}>
        {user.role === 'INSPECTOR' && (
          <InspectorView selectedDate={selectedDate} />
        )}

        {user.role === 'TEACHER' && (
          <TeacherView user={user} selectedDate={selectedDate} />
        )}

        {(user.role === 'DIRECTOR' || user.role === 'DEPUTY_DIRECTOR') && (
          <DirectorView selectedDate={selectedDate} />
        )}

        {user.role === 'SUPER_ADMIN' && (
          <AdminView selectedDate={selectedDate} />
        )}
      </main>
    </div>
  );
}
