import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  databaseUrl = 'postgresql://bozkurt@localhost:5432/maktabim_db';
}

console.log('Connecting to database:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Initializing Database Tables ---');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/lib/schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✓ Tables and indexes created successfully.');

    console.log('--- Seeding Initial Users ---');
    const salt = await bcrypt.genSalt(10);
    const pwHash = async (pw) => await bcrypt.hash(pw, salt);

    const users = [
      { id: 'usr_admin', name: 'Alisher Qodirov (Admin)', username: 'admin', pw: 'admin123', role: 'SUPER_ADMIN', phone: '+998901234567' },
      { id: 'usr_dir', name: 'Botir Rahimov (Direktor)', username: 'direktor', pw: 'direktor123', role: 'DIRECTOR', phone: '+998901112233' },
      { id: 'usr_zam', name: 'Nodira Salimova (Zamdirektor)', username: 'zamdirektor', pw: 'zam123', role: 'DEPUTY_DIRECTOR', phone: '+998902223344' },
      { id: 'usr_davomat', name: 'Javohir Toirov (Davomatchi)', username: 'davomatchi', pw: 'davomat123', role: 'INSPECTOR', phone: '+998903334455' },
      { id: 'usr_ustoz_5a', name: 'Gulnoza Karimova (5-A)', username: 'ustoz', pw: 'ustoz123', role: 'TEACHER', phone: '+998904445566' },
      { id: 'usr_ustoz_9b', name: 'Rustam Ergashev (9-B)', username: 'ustoz_9b', pw: 'ustoz123', role: 'TEACHER', phone: '+998905556677' },
      { id: 'usr_ustoz_11a', name: 'Dilnoza Yusupova (11-A)', username: 'ustoz_11a', pw: 'ustoz123', role: 'TEACHER', phone: '+998906667788' },
    ];

    for (const u of users) {
      const hash = await pwHash(u.pw);
      await client.query(
        `INSERT INTO users (id, name, username, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE 
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, phone = EXCLUDED.phone;`,
        [u.id, u.name, u.username, hash, u.role, u.phone]
      );
    }
    console.log(`✓ ${users.length} users seeded.`);

    console.log('--- Seeding Classes ---');
    const classes = [
      { id: 'cls_5a', name: '5-A', grade: 5, shift: 1, room: '101-xona', teacher_id: 'usr_ustoz_5a' },
      { id: 'cls_5b', name: '5-B', grade: 5, shift: 1, room: '102-xona', teacher_id: null },
      { id: 'cls_6a', name: '6-A', grade: 6, shift: 1, room: '104-xona', teacher_id: null },
      { id: 'cls_9a', name: '9-A', grade: 9, shift: 1, room: '201-xona', teacher_id: null },
      { id: 'cls_9b', name: '9-B', grade: 9, shift: 1, room: '203-xona', teacher_id: 'usr_ustoz_9b' },
      { id: 'cls_11a', name: '11-A', grade: 11, shift: 1, room: '301-xona', teacher_id: 'usr_ustoz_11a' },
      // 2-smena
      { id: 'cls_7a', name: '7-A', grade: 7, shift: 2, room: '105-xona', teacher_id: null },
      { id: 'cls_7b', name: '7-B', grade: 7, shift: 2, room: '106-xona', teacher_id: null },
      { id: 'cls_8a', name: '8-A', grade: 8, shift: 2, room: '205-xona', teacher_id: null },
      { id: 'cls_10a', name: '10-A', grade: 10, shift: 2, room: '302-xona', teacher_id: null },
    ];

    for (const c of classes) {
      await client.query(
        `INSERT INTO classes (id, name, grade, shift, room, teacher_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE 
         SET name = EXCLUDED.name, grade = EXCLUDED.grade, shift = EXCLUDED.shift, room = EXCLUDED.room, teacher_id = EXCLUDED.teacher_id;`,
        [c.id, c.name, c.grade, c.shift, c.room, c.teacher_id]
      );
    }
    console.log(`✓ ${classes.length} classes seeded.`);

    console.log('--- Seeding Students ---');
    const uzbekFirstNamesBoys = ['Asadbek', 'Bobur', 'Diyorbek', 'Jasur', 'Kamron', 'Muhammadali', 'Otabek', 'Sardor', 'Shohruh', 'Ulugbek'];
    const uzbekFirstNamesGirls = ['Aziza', 'Barno', 'Dilnoza', 'Feruza', 'Kamila', 'Madina', 'Rayhon', 'Sevara', 'Shaxnoza', 'Zuhra'];
    const uzbekLastNames = ['Karimov', 'Rahimov', 'Qodirov', 'Aliyev', 'Tursunov', 'Ahmedov', 'Sobirov', 'Nazarov', 'Yusupov', 'Mansurov'];

    let studentIndex = 1;
    const studentsToInsert = [];

    for (const c of classes) {
      // Har bir sinfda 12-15 nafar o'quvchi
      const count = c.name === '5-A' ? 14 : 12;
      for (let i = 0; i < count; i++) {
        const isBoy = i % 2 === 0;
        const fn = isBoy ? uzbekFirstNamesBoys[i % uzbekFirstNamesBoys.length] : uzbekFirstNamesGirls[i % uzbekFirstNamesGirls.length];
        const ln = uzbekLastNames[(i + c.grade) % uzbekLastNames.length] + (isBoy ? '' : 'a');
        const stId = `st_${c.id}_${i + 1}`;
        const phone = `+99890${String(1000000 + studentIndex * 47).slice(-7)}`;
        studentsToInsert.push({
          id: stId,
          class_id: c.id,
          name: `${ln} ${fn}`,
          gender: isBoy ? 'male' : 'female',
          parent_name: `${ln} ${isBoy ? 'Akmal ota' : 'Nodira ona'}`,
          parent_phone: phone,
        });
        studentIndex++;
      }
    }

    for (const st of studentsToInsert) {
      await client.query(
        `INSERT INTO students (id, class_id, name, gender, parent_name, parent_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, parent_name = EXCLUDED.parent_name, parent_phone = EXCLUDED.parent_phone;`,
        [st.id, st.class_id, st.name, st.gender, st.parent_name, st.parent_phone]
      );
    }
    console.log(`✓ ${studentsToInsert.length} students seeded.`);

    console.log('--- Seeding Today Attendance ---');
    const today = new Date().toISOString().split('T')[0];
    
    // 5-A, 5-B, 9-B ga bugungi davomatni simulyatsiya qilamiz
    for (const st of studentsToInsert) {
      let status = 'PRESENT';
      let reason = null;

      // 5-A va 9-B dagi ayrim o'quvchilarga sababli va sababsiz qo'yamiz
      if (st.class_id === 'cls_5a') {
        if (st.id === 'st_cls_5a_3') {
          status = 'ABSENT_EXCUSED';
          reason = 'Mavsumiy shamollash (Shifokor ma\'lumotnomasi bor)';
        } else if (st.id === 'st_cls_5a_7') {
          status = 'ABSENT_UNEXCUSED';
          reason = null;
        } else if (st.id === 'st_cls_5a_10') {
          status = 'LATE';
          reason = 'Tirbandlik sababli 15 daqiqa kechikdi';
        }
      } else if (st.class_id === 'cls_9b') {
        if (st.id === 'st_cls_9b_2') {
          status = 'ABSENT_UNEXCUSED';
        } else if (st.id === 'st_cls_9b_5') {
          status = 'ABSENT_EXCUSED';
          reason = 'Shahar olimpiadasiga jo\'nab ketgan';
        }
      } else if (st.class_id === 'cls_11a') {
        if (st.id === 'st_cls_11a_4') {
          status = 'ABSENT_UNEXCUSED';
        }
      }

      await client.query(
        `INSERT INTO attendance (id, date, student_id, class_id, status, reason, marked_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'usr_davomat')
         ON CONFLICT (student_id, date) DO UPDATE
         SET status = EXCLUDED.status, reason = EXCLUDED.reason;`,
        [`att_${st.id}_${today}`, today, st.id, st.class_id, status, reason]
      );
    }

    // Submission belgisi
    await client.query(
      `INSERT INTO attendance_submissions (id, date, class_id, submitted_by_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP)
       ON CONFLICT (class_id, date) DO NOTHING;`,
      [`sub_cls_5a_${today}`, today, 'cls_5a', 'usr_davomat']
    );

    console.log('--- Seeding System Settings ---');
    const settings = [
      ['school_name', 'Prezident ixtisoslashtirilgan 1-sonli maktab'],
      ['academic_year', '2026-2027'],
      ['attendance_start_time', '08:00'],
      ['attendance_end_time', '09:30'],
      ['allow_late_editing', 'true'],
    ];

    for (const [k, v] of settings) {
      await client.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
        [k, v]
      );
    }

    console.log('🎉 BAZA TO‘LIQ TAYYOR BO‘LDI!');
    console.log(`
      Super Admin:     admin / admin123
      Direktor:        direktor / direktor123
      Zamdirektor:     zamdirektor / zam123
      Sinf Rahbari:    ustoz / ustoz123 (5-A sinf)
      Davomatchi:      davomatchi / davomat123
    `);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
