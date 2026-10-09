'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, School, UserPlus, Settings, Shield, Plus, 
  Trash2, Search, Edit2, CheckCircle2, Lock, Key, Clock, Save, X
} from 'lucide-react';

interface AdminViewProps {
  selectedDate: string;
}

export function AdminView({ selectedDate }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'students' | 'users' | 'settings'>('overview');
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modallar holati
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Form State: Yangi Sinf
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('5');
  const [newClassShift, setNewClassShift] = useState('1');
  const [newClassRoom, setNewClassRoom] = useState('');
  const [newClassTeacherId, setNewClassTeacherId] = useState('');

  // Form State: Yangi O'quvchi
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  // Form State: Yangi Xodim
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('TEACHER');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Ma'lumotlarni yuklash
  const loadData = async () => {
    setLoading(true);
    try {
      const [clsRes, stRes, usrRes] = await Promise.all([
        fetch(`/api/classes?date=${selectedDate}`),
        fetch(`/api/students?search=${encodeURIComponent(searchStudent)}`),
        fetch('/api/users'),
      ]);

      const clsData = await clsRes.json();
      const stData = await stRes.json();
      const usrData = await usrRes.json();

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
    loadData();
  }, [selectedDate, searchStudent]);

  // Yangi Sinf qo'shish
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
        }),
      });
      if (res.ok) {
        setShowAddClassModal(false);
        setNewClassName('');
        setToast('Yangi sinf muvaffaqiyatli qo‘shildi');
        setTimeout(() => setToast(null), 3000);
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || 'Xatolik');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Yangi O'quvchi qo'shish
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
        }),
      });
      if (res.ok) {
        setShowAddStudentModal(false);
        setNewStudentName('');
        setNewStudentParent('');
        setNewStudentPhone('');
        setToast('O‘quvchi ro‘yxatga qo‘shildi');
        setTimeout(() => setToast(null), 3000);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // O'quvchini o'chirish
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`${name}ni bazadan o‘chirishni tasdiqlaysizmi?`)) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast('O‘quvchi o‘chirildi');
        setTimeout(() => setToast(null), 3000);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Yangi Xodim qo'shish
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
          phone: newUserPhone,
        }),
      });
      if (res.ok) {
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setToast('Yangi xodim muvaffaqiyatli yaratildi');
        setTimeout(() => setToast(null), 3000);
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || 'Xatolik');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Sarlavha */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              🛡️ Super Admin Boshqaruv Markazi
            </h1>
            <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full">
              To‘liq huquq
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Maktab tuzilmasi, foydalanuvchilar, sinflar va o‘quvchilar bazasini boshqarish
          </p>
        </div>

        {/* Tab Menyu */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Umumiy
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'classes' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Sinflar ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'students' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            O‘quvchilar ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'users' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Xodimlar ({usersList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Jami Sinflar</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{classes.length}</div>
              <span className="text-xs text-blue-600 font-semibold mt-1 block">1-va 2-smena</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Jami O‘quvchilar</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{students.length}</div>
              <span className="text-xs text-emerald-600 font-semibold mt-1 block">Bazada ro‘yxatda</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Tizim Foydalanuvchilari</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{usersList.length}</div>
              <span className="text-xs text-purple-600 font-semibold mt-1 block">O‘qituvchi & Admin</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Baza Holati</span>
              <div className="text-xl font-black text-emerald-600 mt-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                PostgreSQL Faol
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Neon / Supabase tayyor</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SINFLAR BOSHQARUVI */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Mavjud Sinflar Ro‘yxati</h2>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
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
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-700">
                    {cls.total_students} o‘quvchi
                  </span>
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

      {/* TAB 3: O'QUVCHILAR BAZASI */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Qidiruv */}
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

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                        <button
                          onClick={() => handleDeleteStudent(st.id, st.name)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FOYDALANUVCHILAR VA ROLLARI */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Xodimlar va Huquqlar</h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
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
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {u.role}
                  </span>
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  Tel: {u.phone || 'Kiritilmagan'}
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

      {/* MODAL: YANGI SINF QO'SHISH */}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bosqich (Sinf raqami)</label>
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
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  Qo‘shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: YANGI O'QUVCHI QO'SHISH */}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefon raqam</label>
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
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: YANGI XODIM QO'SHISH */}
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
                  className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
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
