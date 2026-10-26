export type Role = 
  | 'SUPER_ADMIN'      // Texnik administrator (Barcha maktablar boshqaruvi)
  | 'DIRECTOR'         // Maktab direktori (O'z maktabi asosiy rahbari)
  | 'DEPUTY_DIRECTOR'  // O'quv yoki ma'naviyat ishlari bo'yicha o'rinbosar
  | 'TEACHER'          // Sinf rahbari
  | 'INSPECTOR';       // Davomatchi (Navbatchi o'qituvchi / inspektor)

export type AttendanceStatus = 
  | 'PRESENT'           // Kelgan (Yashil)
  | 'ABSENT_UNEXCUSED'  // Kelmagan (Sababsiz - Qizil)
  | 'ABSENT_EXCUSED'    // Kelmagan (Sababli - Sariq)
  | 'LATE';             // Kechikkan (Moviy)

export interface School {
  id: string;
  name: string;
  code?: string;
  region?: string;
  district?: string;
  address?: string;
  phone?: string;
  student_count?: number;
  class_count?: number;
  teacher_count?: number;
  attendance_rate?: number;
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password_hash?: string;
  raw_password?: string;
  schedule?: Record<string, Array<{ hour: number; class_name: string; subject: string; room?: string }>>;
  work_days?: string[];
  role: Role;
  school_id?: string | null;
  school_name?: string | null;
  phone?: string;
  avatar?: string;
  assigned_class_id?: string;
  assigned_class_name?: string;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  school_name?: string;
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
  school_id: string;
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
  school_id?: string;
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

export interface DailySchoolStats {
  date: string;
  school_id?: string;
  school_name?: string;
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
  risk_students: any[];
}
