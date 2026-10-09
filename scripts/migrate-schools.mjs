import pg from 'pg';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if available
const envPath = path.resolve(__dirname, '../.env');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k === 'DATABASE_URL' && !databaseUrl) {
        databaseUrl = v.join('=').replace(/^["']|["']$/g, '');
      }
    }
  }
}

if (!databaseUrl) {
  databaseUrl = 'postgresql://bozkurt:maktabim123@localhost:5432/maktabim_db';
}

console.log('Migrating database at:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Step 1: Creating schools table ---');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        region VARCHAR(100),
        district VARCHAR(100),
        address VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('--- Step 2: Seeding initial schools ---');
    await client.query(`
      INSERT INTO schools (id, name, code, region, district, address, phone)
      VALUES 
        ('sch_1', '1-sonli ixtisoslashtirilgan davlat maktabi', 'MAK-001', 'Toshkent shahri', 'Yunusobod tumani', 'Amir Temur ko‘chasi, 45', '+998712345678'),
        ('sch_2', '21-sonli umumtaʼlim maktabi', 'MAK-021', 'Samarqand viloyati', 'Samarqand shahri', 'Buyuk Ipak Yo‘li, 12', '+998662334455')
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, region = EXCLUDED.region, district = EXCLUDED.district;
    `);

    console.log('--- Step 3: Adding school_id columns to existing tables ---');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) REFERENCES schools(id) ON DELETE SET NULL;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE;
      ALTER TABLE attendance_submissions ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE;
    `);

    console.log('--- Step 4: Linking existing data to sch_1 ---');
    await client.query(`UPDATE users SET school_id = 'sch_1' WHERE school_id IS NULL AND role != 'SUPER_ADMIN';`);
    await client.query(`UPDATE classes SET school_id = 'sch_1' WHERE school_id IS NULL;`);
    await client.query(`UPDATE students SET school_id = 'sch_1' WHERE school_id IS NULL;`);
    await client.query(`UPDATE attendance SET school_id = 'sch_1' WHERE school_id IS NULL;`);
    await client.query(`UPDATE attendance_submissions SET school_id = 'sch_1' WHERE school_id IS NULL;`);

    console.log('--- Step 5: Adding Indexes ---');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
      CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date);
    `);

    console.log('🎉 MULTI-MAKTAB BAZA MIGRATSIYASI MUVAFFAQIYATLI YAKUNLANDI!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
