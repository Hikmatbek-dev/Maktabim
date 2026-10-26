import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
const envPath = path.resolve(__dirname, '../.env');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k === 'DATABASE_URL' && !databaseUrl) {
        databaseUrl = v.join('=').trim();
      }
    }
  }
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const subjects = [
  'Matematika', 'Ona tili', 'Adabiyot', 'Ingliz tili', 'Fizika', 
  'Kimyo', 'Biologiya', 'Tarix', 'Informatika', 'Geografiya', 'Jismoniy tarbiya',
  'Nemis tili', 'Texnologiya', 'Musiqa', 'Tasviriy san’at'
];

async function run() {
  const classesRes = await pool.query('SELECT name FROM classes ORDER BY grade, name');
  const classNames = classesRes.rows.map(r => r.name);

  const teachersRes = await pool.query(
    "SELECT u.id, u.name, c.name as assigned_class_name FROM users u LEFT JOIN classes c ON c.teacher_id = u.id WHERE u.role = 'TEACHER' ORDER BY u.name"
  );

  console.log(`Found ${teachersRes.rows.length} teachers.`);

  for (let i = 0; i < teachersRes.rows.length; i++) {
    const t = teachersRes.rows[i];
    const subj = subjects[i % subjects.length];
    const mainClass = t.assigned_class_name || classNames[i % classNames.length] || '5-A';
    const otherClass = classNames[(i + 3) % classNames.length] || '6-B';
    const otherClass2 = classNames[(i + 7) % classNames.length] || '9-A';

    // Hafta kunlari jadvali: Dushanba - Shanba
    const sched = {
      'Dushanba': [
        { hour: 1, class_name: mainClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 2, class_name: otherClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 4, class_name: otherClass2, subject: subj, room: (200 + (i % 25)).toString() }
      ],
      'Seshanba': [
        { hour: 2, class_name: otherClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 3, class_name: mainClass, subject: subj, room: (200 + (i % 25)).toString() }
      ],
      'Chorshanba': [
        { hour: 1, class_name: mainClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 3, class_name: otherClass2, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 5, class_name: otherClass, subject: subj, room: (200 + (i % 25)).toString() }
      ],
      'Payshanba': [
        { hour: 2, class_name: mainClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 4, class_name: otherClass, subject: subj, room: (200 + (i % 25)).toString() }
      ],
      'Juma': [
        { hour: 1, class_name: mainClass, subject: subj, room: (200 + (i % 25)).toString() },
        { hour: 2, class_name: otherClass2, subject: subj, room: (200 + (i % 25)).toString() }
      ],
      'Shanba': [
        { hour: 3, class_name: otherClass, subject: subj, room: (200 + (i % 25)).toString() }
      ]
    };

    const workDays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

    await pool.query(
      'UPDATE users SET schedule = $1, work_days = $2 WHERE id = $3',
      [JSON.stringify(sched), workDays, t.id]
    );
  }

  console.log(`✓ All ${teachersRes.rows.length} teacher schedules updated successfully!`);
  await pool.end();
}

run().catch(err => {
  console.error(err);
  pool.end();
});
