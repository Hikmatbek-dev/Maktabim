export type Role = 
  | 'SUPER_ADMIN'      // Texnik administrator (Biz)
  | 'DIRECTOR'         // Maktab direktori (Asosiy rahbar)
  | 'DEPUTY_DIRECTOR'  // O'quv yoki ma'naviyat ishlari bo'yicha o'rinbosar (Zamdirektor)
  | 'TEACHER'          // Sinf rahbari
  | 'INSPECTOR';       // Davomatchi (Navbatchi o'qituvchi / inspektor)

export type AttendanceStatus = 
  | 'PRESENT'           // Kelgan (Yashil)
  | 'ABSENT_UNEXCUSED'  // Kelmagan (Sababsiz - Qizil)
  | 'ABSENT_EXCUSED'    // Kelmagan (Sababli - Sariq)
  | 'LATE';             // Kechikkan (To'q sariq/Moviy)

export interface User {
  id: string;
  name: string;
  username: string;
  password_hash?: string;
  role: Role;
  phone?: string;
  avatar?: string;
  assigned_class_id?: string;
  assigned_class_name?: string;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  name: string;          // Masalan: "5-A", "9-B", "11-A"
  grade: number;         // 1 dan 11 gacha
  shift: 1 | 2;          // 1-smena yoki 2-smena
  room?: string;         // Xona raqami
  teacher_id?: string;
  teacher_name?: string;
  teacher_phone?: string;
  student_count?: number;
  created_at?: string;
}

export interface Student {
  id: string;
  class_id: string;
  class_name?: string;
  name: string;
  gender: 'male' | 'female';
  birth_date?: string;
  parent_name?: string;
  parent_phone?: string;
  status: 'active' | 'transferred' | 'expelled';
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  student_id: string;
  student_name?: string;
  class_id: string;
  class_name?: string;
  status: AttendanceStatus;
  reason?: string | null;
  doctor_note_url?: string | null;
  marked_by_id?: string;
  marked_by_name?: string;
  confirmed_by_id?: string;
  confirmed_by_name?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClassAttendanceSummary {
  class_id: string;
  class_name: string;
  shift: 1 | 2;
  grade: number;
  teacher_name?: string;
  total_students: number;
  present_count: number;
  unexcused_count: number;
  excused_count: number;
  late_count: number;
  percentage: number;
  is_submitted: boolean;
  submitted_at?: string;
  submitted_by?: string;
}

export interface DailySchoolStats {
  date: string;
  total_students: number;
  total_present: number;
  total_absent_unexcused: number;
  total_absent_excused: number;
  total_late: number;
  attendance_rate: number;
  total_classes: number;
  submitted_classes_count: number;
  pending_classes_count: number;
  shift1_stats: {
    total: number;
    present: number;
    rate: number;
  };
  shift2_stats: {
    total: number;
    present: number;
    rate: number;
  };
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: Role;
  action: string;
  details?: string;
  created_at: string;
}

export interface SystemSettings {
  school_name: string;
  academic_year: string;
  attendance_start_time: string; // Masalan: "07:30"
  attendance_end_time: string;   // Masalan: "10:00"
  allow_late_editing: boolean;
}
