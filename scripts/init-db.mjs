import pg from 'pg';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// DNS patch for AWS/Neon CGNAT private IP and IPv6
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return origLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (Array.isArray(addresses)) {
      const publicIpv4 = addresses.filter((a) => {
        if (a.family !== 4) return false;
        if (a.address.startsWith('100.')) {
          const second = parseInt(a.address.split('.')[1] || '0', 10);
          if (second >= 64 && second <= 127) return false;
        }
        return true;
      });
      const chosen = publicIpv4.length > 0 ? publicIpv4 : addresses;
      if (options && options.all) {
        return callback(null, chosen);
      } else {
        return callback(null, chosen[0].address, chosen[0].family);
      }
    }
    return callback(null, addresses);
  });
};

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

    console.log('--- Seeding Schools ---');
    await client.query(`
      INSERT INTO schools (id, name, code, region, district, address, phone)
      VALUES 
        ('sch_1', '1-sonli ixtisoslashtirilgan davlat maktabi', 'MAK-001', 'Toshkent shahri', 'Yunusobod tumani', 'Amir Temur ko‘chasi, 45', '+998712345678'),
        ('sch_2', '21-sonli umumtaʼlim maktabi', 'MAK-021', 'Samarqand viloyati', 'Samarqand shahri', 'Buyuk Ipak Yo‘li, 12', '+998662334455')
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, region = EXCLUDED.region, district = EXCLUDED.district;
    `);
    console.log('✓ 2 schools seeded.');

    console.log('--- Seeding Initial Users ---');
    const salt = await bcrypt.genSalt(10);
    const pwHash = async (pw) => await bcrypt.hash(pw, salt);

    const users = [
      { id: 'usr_admin', name: 'Alisher Qodirov (Admin)', username: 'admin', pw: 'admin123', role: 'SUPER_ADMIN', phone: '+998901234567', school_id: null },
      { id: 'usr_dir', name: 'Botir Rahimov (Direktor)', username: 'direktor', pw: 'direktor123', role: 'DIRECTOR', phone: '+998901112233', school_id: 'sch_1' },
      { id: 'usr_zam', name: 'Nodira Salimova (Zamdirektor)', username: 'zamdirektor', pw: 'zam123', role: 'DEPUTY_DIRECTOR', phone: '+998902223344', school_id: 'sch_1' },
      { id: 'usr_davomat', name: 'Javohir Toirov (Davomatchi)', username: 'davomatchi', pw: 'davomat123', role: 'INSPECTOR', phone: '+998903334455', school_id: 'sch_1' },
      { id: 'usr_ustoz_5a', name: 'Gulnoza Karimova (5-A)', username: 'ustoz', pw: 'ustoz123', role: 'TEACHER', phone: '+998904445566', school_id: 'sch_1' },
      { id: 'usr_ustoz_9b', name: 'Rustam Ergashev (9-B)', username: 'ustoz_9b', pw: 'ustoz123', role: 'TEACHER', phone: '+998905556677', school_id: 'sch_1' },
      { id: 'usr_ustoz_11a', name: 'Dilnoza Yusupova (11-A)', username: 'ustoz_11a', pw: 'ustoz123', role: 'TEACHER', phone: '+998906667788', school_id: 'sch_1' },
    ];

    for (const u of users) {
      const hash = await pwHash(u.pw);
      await client.query(
        `INSERT INTO users (id, school_id, name, username, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO UPDATE 
         SET name = EXCLUDED.name, school_id = EXCLUDED.school_id, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, phone = EXCLUDED.phone;`,
        [u.id, u.school_id, u.name, u.username, hash, u.role, u.phone]
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
        `INSERT INTO classes (id, school_id, name, grade, shift, room, teacher_id)
         VALUES ($1, 'sch_1', $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE 
         SET school_id = 'sch_1', name = EXCLUDED.name, grade = EXCLUDED.grade, shift = EXCLUDED.shift, room = EXCLUDED.room, teacher_id = EXCLUDED.teacher_id;`,
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
      const count = c.name === '5-A' ? 14 : 12;
      for (let i = 0; i < count; i++) {
        const isBoy = i % 2 === 0;
        const fn = isBoy ? uzbekFirstNamesBoys[i % uzbekFirstNamesBoys.length] : uzbekFirstNamesGirls[i % uzbekFirstNamesGirls.length];
        const ln = uzbekLastNames[(i + c.grade) % uzbekLastNames.length] + (isBoy ? '' : 'a');
        const stId = `st_${c.id}_${i + 1}`;
        const phone = `+99890${String(1000000 + studentIndex * 47).slice(-7)}`;
        studentsToInsert.push({
          id: stId,
          school_id: 'sch_1',
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
        `INSERT INTO students (id, school_id, class_id, name, gender, parent_name, parent_phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (id) DO UPDATE
         SET school_id = 'sch_1', name = EXCLUDED.name, parent_name = EXCLUDED.parent_name, parent_phone = EXCLUDED.parent_phone;`,
        [st.id, st.school_id, st.class_id, st.name, st.gender, st.parent_name, st.parent_phone]
      );
    }
    console.log(`✓ ${studentsToInsert.length} students seeded.`);

    console.log('--- Seeding Today Attendance ---');
    const today = new Date().toISOString().split('T')[0];

    for (const st of studentsToInsert) {
      let status = 'PRESENT';
      let reason = null;

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
      }

      await client.query(
        `INSERT INTO attendance (id, school_id, date, student_id, class_id, status, reason, marked_by_id)
         VALUES ($1, 'sch_1', $2, $3, $4, $5, $6, 'usr_davomat')
         ON CONFLICT (student_id, date) DO UPDATE
         SET school_id = 'sch_1', status = EXCLUDED.status, reason = EXCLUDED.reason;`,
        [`att_${st.id}_${today}`, today, st.id, st.class_id, status, reason]
      );
    }

    await client.query(
      `INSERT INTO attendance_submissions (id, school_id, date, class_id, submitted_by_id, status, submitted_at)
       VALUES ($1, 'sch_1', $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP)
       ON CONFLICT (class_id, date) DO UPDATE SET school_id = 'sch_1';`,
      [`sub_cls_5a_${today}`, today, 'cls_5a', 'usr_davomat']
    );

    console.log('🎉 BAZA TO‘LIQ TAYYOR BO‘LDI!');
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
