import React from 'react';
import { Role } from '@/lib/types';

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  switch (role) {
    case 'SUPER_ADMIN':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}>
          🛡️ Super Admin
        </span>
      );
    case 'DIRECTOR':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}>
          🎓 Maktab Direktori
        </span>
      );
    case 'DEPUTY_DIRECTOR':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}>
          📋 Zamdirektor
        </span>
      );
    case 'TEACHER':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
          👩‍🏫 Sinf Rahbari
        </span>
      );
    case 'INSPECTOR':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
          📱 Davomatchi
        </span>
      );
    default:
      return null;
  }
}
