import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://bozkurt:maktabim123@localhost:5432/maktabim_db';

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function seedHistory() {
  const client = await pool.connect();
  try {
    console.log('--- Fetching students and classes ---');
    const studentsRes = await client.query(`SELECT id, class_id, school_id FROM students WHERE status = 'active'`);
    const classesRes = await client.query(`SELECT id, school_id FROM classes`);
    const students = studentsRes.rows;
    const classes = classesRes.rows;
    console.log(`Found ${students.length} students across ${classes.length} classes.`);

    // Generate school dates from 2026-09-02 to 2026-10-16 (Monday to Saturday, skip Sunday)
    const dates = [];
    const curr = new Date('2026-09-02T00:00:00Z');
    const end = new Date('2026-10-16T00:00:00Z');

    while (curr <= end) {
      const day = curr.getUTCDay();
      if (day !== 0) { // Skip Sunday (0 is Sunday, 1..6 is Mon..Sat)
        dates.push(curr.toISOString().split('T')[0]);
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    console.log(`Generating attendance for ${dates.length} school days...`);

    const reasons = [
      'Kasallik (spravka bor)',
      'Oilaviy sabab',
      'Musobaqa yoki olimpiada',
      'Boshqa uzrli sabab',
    ];

    // Identify a few specific students who will be high-attendance and some who are chronic absentees
    const chronicAbsentees = new Set(students.slice(0, 15).map(s => s.id));
    const starStudents = new Set(students.slice(15, 60).map(s => s.id));

    // To prevent inserting duplicates, let's see which dates already exist
    const existingRes = await client.query(`SELECT DISTINCT date::text FROM attendance`);
    const existingDates = new Set(existingRes.rows.map(r => r.date));

    let insertedRecords = 0;

    for (const dateStr of dates) {
      if (existingDates.has(dateStr)) {
        console.log(`Skipping date ${dateStr} (already has attendance)`);
        continue;
      }

      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getUTCDay(); // 1=Mon, 6=Sat

      // Saturday typically has slightly lower attendance (88-92%), Tuesday/Wed highest (95-97%)
      const basePresentChance = dayOfWeek === 6 ? 0.89 : dayOfWeek === 1 ? 0.92 : 0.95;

      const attValues = [];
      for (const st of students) {
        let status = 'PRESENT';
        let reason = null;

        if (chronicAbsentees.has(st.id)) {
          // Absent 50% of the time
          if (Math.random() < 0.5) {
            status = 'ABSENT_UNEXCUSED';
          } else if (Math.random() < 0.3) {
            status = 'ABSENT_EXCUSED';
            reason = reasons[Math.floor(Math.random() * reasons.length)];
          }
        } else if (starStudents.has(st.id)) {
          // Almost 100% present
          if (Math.random() < 0.02) {
            status = 'LATE';
            reason = 'Tirbandlik sababli 10 daqiqa kechikdi';
          }
        } else {
          // Regular student distribution
          const rand = Math.random();
          if (rand > basePresentChance) {
            const subRand = Math.random();
            if (subRand < 0.45) {
              status = 'ABSENT_UNEXCUSED';
            } else if (subRand < 0.8) {
              status = 'ABSENT_EXCUSED';
              reason = reasons[Math.floor(Math.random() * reasons.length)];
            } else {
              status = 'LATE';
              reason = 'Kechikib keldi';
            }
          }
        }

        const attId = `att_${st.id}_${dateStr}`;
        attValues.push(`('${attId}', '${st.school_id || 'sch_1'}', '${dateStr}', '${st.id}', '${st.class_id}', '${status}', ${reason ? `'${reason}'` : 'NULL'}, 'usr_davomat')`);
      }

      // Batch insert attendance in chunks
      const chunkSize = 500;
      for (let i = 0; i < attValues.length; i += chunkSize) {
        const chunk = attValues.slice(i, i + chunkSize);
        await client.query(`
          INSERT INTO attendance (id, school_id, date, student_id, class_id, status, reason, marked_by_id)
          VALUES ${chunk.join(', ')}
          ON CONFLICT (student_id, date) DO NOTHING
        `);
      }

      // Insert attendance submissions for each class
      const subValues = classes.map(c => {
        const subId = `sub_${c.id}_${dateStr}`;
        return `('${subId}', '${c.school_id || 'sch_1'}', '${dateStr}', '${c.id}', 'usr_davomat', 'SUBMITTED', '${dateStr} 09:30:00')`;
      });

      await client.query(`
        INSERT INTO attendance_submissions (id, school_id, date, class_id, submitted_by_id, status, submitted_at)
        VALUES ${subValues.join(', ')}
        ON CONFLICT (class_id, date) DO NOTHING
      `);

      insertedRecords += attValues.length;
      console.log(`✓ Seeded ${dateStr} (${attValues.length} records)`);
    }

    console.log(`✓ Successfully seeded ${insertedRecords} historical attendance records.`);
  } catch (err) {
    console.error('Error seeding history:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedHistory();
