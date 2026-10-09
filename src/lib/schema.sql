-- MAKTABIM PLATFORMASI MA'LUMOTLAR BAZASI SXEMASI
-- PostgreSQL / Neon / Supabase moslashuvchan

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, DIRECTOR, DEPUTY_DIRECTOR, TEACHER, INSPECTOR
    phone VARCHAR(50),
    avatar VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- Masalan: 5-A, 9-B
    grade INTEGER NOT NULL,    -- 1 - 11
    shift SMALLINT NOT NULL DEFAULT 1, -- 1 yoki 2
    room VARCHAR(50),
    teacher_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'male',
    birth_date DATE,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, transferred, expelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT', -- PRESENT, ABSENT_UNEXCUSED, ABSENT_EXCUSED, LATE
    reason TEXT,
    doctor_note_url TEXT,
    marked_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    confirmed_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_submissions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    submitted_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, VERIFIED
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_class_date_submission UNIQUE (class_id, date)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Tezkor qidiruv va hisobotlar uchun indekslar
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_shift ON classes(shift);
