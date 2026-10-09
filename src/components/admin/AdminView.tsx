'use client';

import React, { useState, useEffect } from 'react';
import { School } from '@/lib/types';
import { 
  Users, School as SchoolIcon, UserPlus, Settings, Shield, Plus, 
  Trash2, Search, Edit2, CheckCircle2, Lock, Key, Clock, Save, X, 
  MapPin, Phone, Building2, Check, ArrowRight, ExternalLink
} from 'lucide-react';

interface AdminViewProps {
  selectedDate: string;
  currentSchoolId: string;
  onSelectSchool: (schoolId: string) => void;
}

export function AdminView({ selectedDate, currentSchoolId, onSelectSchool }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'schools' | 'classes' | 'students' | 'users' | 'overview'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modallar
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Form: Yangi Maktab
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolRegion, setNewSchoolRegion] = useState('Toshkent shahri');
  const [newSchoolDistrict, setNewSchoolDistrict] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');

  // Form: Yangi Sinf
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('5');
  const [newClassShift, setNewClassShift] = useState('1');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [newClassTeacherId, setNewClassTeacherId] = useState('');
  const [newClassSchoolId, setNewClassSchoolId] = useState(currentSchoolId);

  // Form: Yangi O'quvchi
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  // Form: Yangi Xodim
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('TEACHER');
  const [newUserSchoolId, setNewUserSchoolId] = useState(currentSchoolId);
  const [newUserPhone, setNewUserPhone] = useState('');

  // Ma'lumotlarni yuklash
  const loadAll = async () => {
    setLoading(true);
    try {
      const [schRes, clsRes, stRes, usrRes] = await Promise.all([
        fetch(`/api/schools?date=${selectedDate}`),
        fetch(`/api/classes?date=${selectedDate}&school_id=${currentSchoolId}`),
        fetch(`/api/students?search=${encodeURIComponent(searchStudent)}&school_id=${currentSchoolId}`),
        fetch(`/api/users?school_id=${currentSchoolId}`),
      ]);

      const schData = await schRes.json();
      const clsData = await clsRes.json();
      const stData = await stRes.json();
      const usrData = await usrRes.json();

      if (schData.schools) setSchools(schData.schools);
      if (clsData.classes) setClasses(clsData.classes);
      if (stData.students) setStudents(stData.students);
      if (usrData.users) setUsersList(usrData.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedDate, currentSchoolId, searchStudent]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. MAKTAB YARATISH
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSchoolName,
          code: newSchoolCode,
          region: newSchoolRegion,
          district: newSchoolDistrict,
          address: newSchoolAddress,
          phone: newSchoolPhone,
        }),
      });
      if (res.ok) {
        setShowAddSchoolModal(false);
        setNewSchoolName('');
        setNewSchoolCode('');
        setNewSchoolDistrict('');
        setNewSchoolAddress('');
        setNewSchoolPhone('');
        showToastMsg('Yangi maktab muvaffaqiyatli qo‘shildi!');
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Xatolik');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. MAKTABNI TAHRIRLASH
  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    try {
      const res = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSchool),
      });
      if (res.ok) {
        setEditingSchool(null);
        showToastMsg('Maktab maʼlumotlari yangilandi!');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. MAKTABNI O'CHIRISH
  const handleDeleteSchool = async (school: School) => {
    if (!confirm(`Haqiqatan ham "${school.name}" maktabini va unga tegishli barcha sinf, o‘quvchi va davomatlarni o‘chirishni xohlaysizmi?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/schools/${school.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToastMsg(`"${school.name}" o‘chirildi`);
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. SINF YARATISH
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          grade: newClassGrade,
          shift: newClassShift,
          room: newClassRoom,
          teacher_id: newClassTeacherId || null,
          school_id: newClassSchoolId || currentSchoolId,
        }),
      });
      if (res.ok) {
        setShowAddClassModal(false);
        setNewClassName('');
        showToastMsg('Yangi sinf qo‘shildi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. SINFNI O'CHIRISH
  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`"${name}" sinfini o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/classes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToastMsg('Sinf o‘chirildi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. O'QUVCHI YARATISH
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName,
          class_id: newStudentClassId || classes[0]?.id,
          gender: newStudentGender,
          parent_name: newStudentParent,
          parent_phone: newStudentPhone,
          school_id: currentSchoolId,
        }),
      });
      if (res.ok) {
        setShowAddStudentModal(false);
        setNewStudentName('');
        setNewStudentParent('');
        setNewStudentPhone('');
        showToastMsg('O‘quvchi ro‘yxatga qo‘shildi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. O'QUVCHINI TAHRIRLASH
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStudent),
      });
      if (res.ok) {
        setEditingStudent(null);
        showToastMsg('O‘quvchi yangilandi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. O'QUVCHINI O'CHIRISH
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`${name}ni bazadan o‘chirishni tasdiqlaysizmi?`)) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToastMsg('O‘quvchi o‘chirildi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 9. XODIM YARATISH
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          school_id: newUserSchoolId || currentSchoolId,
          phone: newUserPhone,
        }),
      });
      if (res.ok) {
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        showToastMsg('Yangi xodim yaratildi');
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Xatolik');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 10. XODIMNI O'CHIRISH
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`${name} xodimini o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToastMsg('Xodim o‘chirildi');
        loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentSchool = schools.find((s) => s.id === currentSchoolId) || schools[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Sarlavha & Tablar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🛡️ Super Admin</span>
              <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full">
                Multi-Maktab Tizimi
              </span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Joriy tanlangan maktab: <strong className="text-slate-800">{currentSchool?.name || '1-sonli maktab'}</strong>
          </p>
        </div>

        {/* Tab Menyu (Stitch Segmented Style) */}
        <div className="flex items-center gap-1.5 bg-[#F2F3FF] p-1.5 rounded-2xl border border-[#C4C5D7]/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'schools'
                ? 'bg-white text-[#0037B0] shadow-xs'
                : 'text-[#434655] hover:text-[#131B2E]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain</span>
            <span>Maktablar ({schools.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'bg-white text-[#0037B0] shadow-xs'
                : 'text-[#434655] hover:text-[#131B2E]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">meeting_room</span>
            <span>Sinflar ({classes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'bg-white text-[#0037B0] shadow-xs'
                : 'text-[#434655] hover:text-[#131B2E]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            <span>O‘quvchilar ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-[#0037B0] shadow-xs'
                : 'text-[#434655] hover:text-[#131B2E]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>Xodimlar ({usersList.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MAKTABLAR BOSHQARUVI (MULTI-TENANT SCHOOLS)
         ========================================================================= */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Maktablar Ro‘yxati</h2>
              <p className="text-xs text-slate-500">Tizimda ulangan barcha davlat va xususiy maktablar</p>
            </div>
            <button
              onClick={() => setShowAddSchoolModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi maktab qo‘shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((sch) => {
              const isSelected = sch.id === currentSchoolId;
              return (
                <div
                  key={sch.id}
                  className={`bg-white rounded-3xl p-5 border-2 transition-all shadow-xs relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-100 shadow-md'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xl">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">
                            {sch.name}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {sch.code || 'Kodsiz'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          Faol
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 my-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sch.region || 'Viloyat yo‘q'}, {sch.district || ''}</span>
                      </div>
                      {sch.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{sch.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Maktab KPI */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center my-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">SINFLAR</span>
                        <span className="font-black text-slate-800 text-sm">{sch.class_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">O‘QUVCHILAR</span>
                        <span className="font-black text-slate-800 text-sm">{sch.student_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">DAVOMAT</span>
                        <span className="font-black text-emerald-600 text-sm">{sch.attendance_rate || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Amallar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectSchool(sch.id)}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                      }`}
                    >
                      <span>{isSelected ? '✓ Tanlangan' : 'Boshqarishga o‘tish'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setEditingSchool(sch)}
                      className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteSchool(sch)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SINFLAR BOSHQARUVI
         ========================================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Sinflar ({currentSchool?.name})
              </h2>
              <p className="text-xs text-slate-500">Mavjud sinflar va sinf rahbarlari</p>
            </div>
            <button
              onClick={() => {
                setNewClassSchoolId(currentSchoolId);
                setShowAddClassModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi sinf qo‘shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-black flex items-center justify-center text-lg">
                      {cls.name}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">{cls.shift}-smena</span>
                      <div className="text-xs text-slate-400">{cls.room || 'Xona yo‘q'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-700">
                      {cls.total_students} o‘quvchi
                    </span>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sinfni o‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Sinf rahbari:</span>{' '}
                  <span className="font-semibold text-slate-800">{cls.teacher_name || 'Biriktirilmagan'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: O'QUVCHILAR BAZASI
         ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="O‘quvchi yoki ota-onasi ismi bo‘yicha qidirish..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full bg-white pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi o‘quvchi</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">F.I.Sh</th>
                    <th className="py-3 px-4">Sinf</th>
                    <th className="py-3 px-4">Jinsi</th>
                    <th className="py-3 px-4">Ota-onasi</th>
                    <th className="py-3 px-4">Telefon</th>
                    <th className="py-3 px-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {students.slice(0, 50).map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-bold">{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                      <td className="py-3 px-4 text-purple-700 font-bold">{st.class_name}</td>
                      <td className="py-3 px-4 text-slate-600">{st.gender === 'male' ? 'O‘g‘il' : 'Qiz'}</td>
                      <td className="py-3 px-4 text-slate-700">{st.parent_name || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{st.parent_phone || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingStudent(st)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="O‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: XODIMLAR VA ROLLARI
         ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Xodimlar Ro‘yxati</h2>
              <p className="text-xs text-slate-500">O‘qituvchilar, davomatchilar va maktab rahbarlari</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Yangi xodim qo‘shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {usersList.map((u) => (
              <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{u.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">@{u.username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {u.role}
                    </span>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md"
                      title="Xodimni o‘chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div>Tel: {u.phone || 'Kiritilmagan'}</div>
                  {u.school_name && (
                    <div className="text-purple-700 font-semibold mt-0.5">
                      🏫 {u.school_name}
                    </div>
                  )}
                  {u.assigned_class_name && (
                    <div className="text-emerald-700 font-semibold mt-0.5">
                      Sinfi: {u.assigned_class_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALLAR
         ========================================================================= */}

      {/* MODAL 1: YANGI MAKTAB QO'SHISH */}
      {showAddSchoolModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Yangi Maktab Qo‘shish</h3>
              <button onClick={() => setShowAddSchoolModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSchool} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maktab nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: 45-sonli ixtisoslashtirilgan maktab"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maktab kodi</label>
                  <input
                    type="text"
                    placeholder="MAK-045"
                    value={newSchoolCode}
                    onChange={(e) => setNewSchoolCode(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Viloyat / Shahar</label>
                  <input
                    type="text"
                    placeholder="Toshkent shahri"
                    value={newSchoolRegion}
                    onChange={(e) => setNewSchoolRegion(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tuman</label>
                  <input
                    type="text"
                    placeholder="Chilonzor tumani"
                    value={newSchoolDistrict}
                    onChange={(e) => setNewSchoolDistrict(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="+998712003344"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manzil</label>
                <input
                  type="text"
                  placeholder="Navoiy ko‘chasi, 15-uy"
                  value={newSchoolAddress}
                  onChange={(e) => setNewSchoolAddress(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSchoolModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  Maktabni yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MAKTABNI TAHRIRLASH */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Maktabni Tahrirlash</h3>
              <button onClick={() => setEditingSchool(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSchool} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maktab nomi</label>
                <input
                  type="text"
                  required
                  value={editingSchool.name}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Viloyat</label>
                  <input
                    type="text"
                    value={editingSchool.region || ''}
                    onChange={(e) => setEditingSchool({ ...editingSchool, region: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tuman</label>
                  <input
                    type="text"
                    value={editingSchool.district || ''}
                    onChange={(e) => setEditingSchool({ ...editingSchool, district: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: YANGI SINF QO'SHISH */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Yangi sinf qo‘shish</h3>
              <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maktab</label>
                <select
                  value={newClassSchoolId}
                  onChange={(e) => setNewClassSchoolId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-bold"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sinf nomi (Masalan: 7-B)</label>
                <input
                  type="text"
                  required
                  placeholder="7-B"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bosqich</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                      <option key={g} value={g}>{g}-sinf</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Smena</label>
                  <select
                    value={newClassShift}
                    onChange={(e) => setNewClassShift(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  >
                    <option value="1">1-smena</option>
                    <option value="2">2-smena</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xona raqami</label>
                <input
                  type="text"
                  placeholder="105-xona"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Qo‘shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: YANGI O'QUVCHI */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Yangi o‘quvchi kiritish</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">O‘quvchi F.I.Sh</label>
                <input
                  type="text"
                  required
                  placeholder="Abdullayev Sardor"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sinf</label>
                  <select
                    value={newStudentClassId}
                    onChange={(e) => setNewStudentClassId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jinsi</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  >
                    <option value="male">O‘g‘il bola</option>
                    <option value="female">Qiz bola</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ota-onasi F.I.Sh</label>
                <input
                  type="text"
                  placeholder="Abdullayev Farhod"
                  value={newStudentParent}
                  onChange={(e) => setNewStudentParent(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="+998901234567"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: O'QUVCHINI TAHRIRLASH */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">O‘quvchini tahrirlash</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">F.I.Sh</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ota-onasi</label>
                  <input
                    type="text"
                    value={editingStudent.parent_name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_name: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingStudent.parent_phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: YANGI XODIM */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Yangi xodim qo‘shish</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qaysi maktab xodimi?</label>
                <select
                  value={newUserSchoolId}
                  onChange={(e) => setNewUserSchoolId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 font-bold"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xodim F.I.Sh</label>
                <input
                  type="text"
                  required
                  placeholder="Aliyev Vali"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login</label>
                  <input
                    type="text"
                    required
                    placeholder="valiyev"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parol</label>
                  <input
                    type="password"
                    required
                    placeholder="Parol123"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                >
                  <option value="TEACHER">Sinf Rahbari</option>
                  <option value="INSPECTOR">Davomatchi</option>
                  <option value="DEPUTY_DIRECTOR">Zamdirektor</option>
                  <option value="DIRECTOR">Direktor</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="+998901234567"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
