import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const period = searchParams.get('period') || 'weekly'; // 'daily' | 'weekly' | 'monthly' | 'yearly'
    const schoolId = searchParams.get('school_id') || user.school_id || 'sch_1';
    const classId = searchParams.get('class_id') || (user.role === 'TEACHER' ? user.assigned_class_id : null);

    const cacheKey = `analytics_${schoolId}_${period}_${date}_${classId || 'all'}`;
    const cachedData = getCached<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // 1. Umumiy jami o'quvchilar va sinflar soni
    let totalStudentsQuery = `SELECT COUNT(*)::int as count FROM students WHERE status = 'active' AND school_id = $1`;
    const totalStudentsParams: any[] = [schoolId];
    if (classId) {
      totalStudentsQuery += ` AND class_id = $2`;
      totalStudentsParams.push(classId);
    }
    const totalStudentsRes = await query(totalStudentsQuery, totalStudentsParams);
    const totalStudents = totalStudentsRes.rows[0]?.count || 0;

    // 2. Tanlangan sana bo'yicha umumiy KPI
    let dateKpiSql = `
      SELECT status, COUNT(*)::int as count 
      FROM attendance 
      WHERE date = $1 AND school_id = $2
    `;
    const dateKpiParams: any[] = [date, schoolId];
    if (classId) {
      dateKpiSql += ` AND class_id = $3`;
      dateKpiParams.push(classId);
    }
    dateKpiSql += ` GROUP BY status`;
    const dateKpiRes = await query(dateKpiSql, dateKpiParams);

    let present = 0;
    let unexcused = 0;
    let excused = 0;
    let late = 0;
    for (const r of dateKpiRes.rows) {
      if (r.status === 'PRESENT') present = r.count;
      else if (r.status === 'ABSENT_UNEXCUSED') unexcused = r.count;
      else if (r.status === 'ABSENT_EXCUSED') excused = r.count;
      else if (r.status === 'LATE') late = r.count;
    }
    const checkedTotal = present + unexcused + excused + late;
    const currentRate = checkedTotal > 0 ? Math.round(((present + late) / checkedTotal) * 100) : 0;

    // 3. PERIOD BO'YICHA TIMELINE GRAFIKLARI
    let timeline: any[] = [];

    if (period === 'daily') {
      // Kunlik: Sinflar yoki smenalar va parallel sinflar (5-11) kesimida
      let gradesSql = `
        SELECT 
          c.grade,
          COUNT(s.id)::int as total,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused,
          COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused,
          COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late
        FROM classes c
        JOIN students s ON s.class_id = c.id AND s.status = 'active'
        LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
        WHERE c.school_id = $2
      `;
      const gradesParams: any[] = [date, schoolId];
      if (classId) {
        gradesSql += ` AND c.id = $3`;
        gradesParams.push(classId);
      }
      gradesSql += ` GROUP BY c.grade ORDER BY c.grade ASC`;

      const gradesRes = await query(gradesSql, gradesParams);
      timeline = gradesRes.rows.map((r) => {
        const rate = r.total > 0 ? Math.round((r.present / r.total) * 100) : 0;
        return {
          label: `${r.grade}-sinflar`,
          shortLabel: `${r.grade}-sinf`,
          total: r.total,
          present: r.present,
          unexcused: r.unexcused,
          excused: r.excused,
          late: r.late,
          rate,
        };
      });
    } else if (period === 'weekly') {
      // Haftalik: Tanlangan sanagacha bo'lgan so'nggi 6 ta o'qish kuni
      let weeklySql = `
        SELECT 
          a.date::text as date_str,
          COUNT(a.id)::int as total,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused,
          COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused,
          COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late
        FROM attendance a
        WHERE a.school_id = $1 AND a.date <= $2
      `;
      const weeklyParams: any[] = [schoolId, date];
      if (classId) {
        weeklySql += ` AND a.class_id = $3`;
        weeklyParams.push(classId);
      }
      weeklySql += ` GROUP BY a.date ORDER BY a.date DESC LIMIT 7`;

      const weeklyRes = await query(weeklySql, weeklyParams);
      const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      const shortDays = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];

      timeline = weeklyRes.rows.reverse().map((r) => {
        const d = new Date(r.date_str);
        const dayIdx = d.getDay();
        const rate = r.total > 0 ? Math.round((r.present / r.total) * 100) : 0;
        const formattedDate = `${d.getDate()}-${['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'][d.getMonth()]}`;
        return {
          date: r.date_str,
          label: `${shortDays[dayIdx]} (${formattedDate})`,
          shortLabel: shortDays[dayIdx],
          dayName: dayNames[dayIdx],
          total: r.total,
          present: r.present,
          unexcused: r.unexcused,
          excused: r.excused,
          late: r.late,
          rate,
        };
      });
    } else if (period === 'monthly') {
      // Oylik: Joriy oyning haftalari va kunlari bo'yicha agregatsiya
      const targetMonth = date.slice(0, 7); // e.g. '2026-10'
      let monthlySql = `
        SELECT 
          a.date::text as date_str,
          COUNT(a.id)::int as total,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused,
          COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused,
          COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late
        FROM attendance a
        WHERE a.school_id = $1 AND TO_CHAR(a.date, 'YYYY-MM') = $2
      `;
      const monthlyParams: any[] = [schoolId, targetMonth];
      if (classId) {
        monthlySql += ` AND a.class_id = $3`;
        monthlyParams.push(classId);
      }
      monthlySql += ` GROUP BY a.date ORDER BY a.date ASC`;

      const monthlyRes = await query(monthlySql, monthlyParams);
      timeline = monthlyRes.rows.map((r) => {
        const d = new Date(r.date_str);
        const rate = r.total > 0 ? Math.round((r.present / r.total) * 100) : 0;
        return {
          date: r.date_str,
          label: `${d.getDate()}-kun`,
          shortLabel: `${d.getDate()}`,
          total: r.total,
          present: r.present,
          unexcused: r.unexcused,
          excused: r.excused,
          late: r.late,
          rate,
        };
      });
    } else if (period === 'yearly') {
      // Yillik: O'quv yili oylari (Sentabr 2026 - May 2027)
      const academicMonths = [
        { key: '2026-09', label: 'Sentabr', short: 'Sen' },
        { key: '2026-10', label: 'Oktabr', short: 'Okt' },
        { key: '2026-11', label: 'Noyabr', short: 'Noy' },
        { key: '2026-12', label: 'Dekabr', short: 'Dek' },
        { key: '2027-01', label: 'Yanvar', short: 'Yan' },
        { key: '2027-02', label: 'Fevral', short: 'Fev' },
        { key: '2027-03', label: 'Mart', short: 'Mar' },
        { key: '2027-04', label: 'Aprel', short: 'Apr' },
        { key: '2027-05', label: 'May', short: 'May' },
      ];

      let yearlySql = `
        SELECT 
          TO_CHAR(a.date, 'YYYY-MM') as month_str,
          COUNT(a.id)::int as total,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused,
          COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused,
          COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late
        FROM attendance a
        WHERE a.school_id = $1
      `;
      const yearlyParams: any[] = [schoolId];
      if (classId) {
        yearlySql += ` AND a.class_id = $2`;
        yearlyParams.push(classId);
      }
      yearlySql += ` GROUP BY TO_CHAR(a.date, 'YYYY-MM')`;

      const yearlyRes = await query(yearlySql, yearlyParams);
      const monthMap = new Map<string, any>();
      for (const r of yearlyRes.rows) {
        monthMap.set(r.month_str, r);
      }

      timeline = academicMonths.map((m) => {
        const row = monthMap.get(m.key);
        if (row && row.total > 0) {
          const rate = Math.round((row.present / row.total) * 100);
          return {
            label: m.label,
            shortLabel: m.short,
            total: row.total,
            present: row.present,
            unexcused: row.unexcused,
            excused: row.excused,
            late: row.late,
            rate,
            status: 'completed',
          };
        } else {
          return {
            label: m.label,
            shortLabel: m.short,
            total: 0,
            present: 0,
            unexcused: 0,
            excused: 0,
            late: 0,
            rate: 0,
            status: 'upcoming',
          };
        }
      });
    }

    // 4. HAFTA KUNLARI TAHLILI (Dushanbadan Shanbagacha o'rtacha davomat ko'rsatkichi)
    let weekdaySql = `
      SELECT 
        EXTRACT(ISODOW FROM a.date)::int as day_num,
        COUNT(a.id)::int as total,
        COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present,
        COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused,
        COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late
      FROM attendance a
      WHERE a.school_id = $1
    `;
    const weekdayParams: any[] = [schoolId];
    if (classId) {
      weekdaySql += ` AND a.class_id = $2`;
      weekdayParams.push(classId);
    }
    weekdaySql += ` GROUP BY EXTRACT(ISODOW FROM a.date)::int ORDER BY day_num ASC`;

    const weekdayRes = await query(weekdaySql, weekdayParams);
    const isoDayNames: Record<number, { name: string; short: string }> = {
      1: { name: 'Dushanba', short: 'Dush' },
      2: { name: 'Seshanba', short: 'Sesh' },
      3: { name: 'Chorshanba', short: 'Chor' },
      4: { name: 'Payshanba', short: 'Pay' },
      5: { name: 'Juma', short: 'Juma' },
      6: { name: 'Shanba', short: 'Shan' },
    };

    const weekdaysAnalysis = [1, 2, 3, 4, 5, 6].map((dayNum) => {
      const found = weekdayRes.rows.find((r) => r.day_num === dayNum);
      const total = found ? found.total : 0;
      const present = found ? found.present : 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        dayNum,
        dayName: isoDayNames[dayNum].name,
        shortDay: isoDayNames[dayNum].short,
        total,
        present,
        rate,
      };
    });

    // Eng yaxshi va eng past kunlarni aniqlash
    const validDays = weekdaysAnalysis.filter((w) => w.total > 0);
    let bestDay = validDays.length > 0 ? validDays[0] : null;
    let worstDay = validDays.length > 0 ? validDays[0] : null;
    for (const w of validDays) {
      if (bestDay && w.rate > bestDay.rate) bestDay = w;
      if (worstDay && w.rate < worstDay.rate) worstDay = w;
    }

    // 5. REYTING / LEADERBOARD (Top sinflar yoki o'quvchilar)
    let rankings: any = {};

    if (!classId) {
      // Maktab bo'yicha sinflar reytingi (so'nggi 30 kunlik davomat)
      const classRankSql = `
        SELECT 
          c.id,
          c.name,
          c.grade,
          c.shift,
          u.name as teacher_name,
          COUNT(a.id)::int as total_records,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present_records,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused_records,
          ROUND(
            (COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::numeric / 
             NULLIF(COUNT(a.id), 0)::numeric) * 100, 1
          ) as attendance_rate
        FROM classes c
        LEFT JOIN users u ON u.id = c.teacher_id
        LEFT JOIN attendance a ON a.class_id = c.id
        WHERE c.school_id = $1
        GROUP BY c.id, c.name, c.grade, c.shift, u.name
        HAVING COUNT(a.id) > 0
        ORDER BY attendance_rate DESC, present_records DESC
      `;
      const classRankRes = await query(classRankSql, [schoolId]);

      const rankedClasses = classRankRes.rows.map((cls, idx) => ({
        rank: idx + 1,
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        shift: cls.shift,
        teacher_name: cls.teacher_name || 'Biriktirilmagan',
        rate: Number(cls.attendance_rate) || 0,
        unexcused_count: cls.unexcused_records,
        total: cls.total_records,
      }));

      rankings = {
        top_classes: rankedClasses.slice(0, 5),
        bottom_classes: [...rankedClasses].reverse().slice(0, 5),
        all_classes: rankedClasses,
      };
    } else {
      // Aniq bir sinf uchun o'quvchilar intizomi reytingi
      const studentRankSql = `
        SELECT 
          s.id,
          s.name,
          s.gender,
          s.parent_phone,
          COUNT(a.id)::int as total_days,
          COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present_days,
          COUNT(CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 END)::int as unexcused_days,
          COUNT(CASE WHEN a.status = 'ABSENT_EXCUSED' THEN 1 END)::int as excused_days,
          COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as late_days,
          ROUND(
            (COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::numeric / 
             NULLIF(COUNT(a.id), 0)::numeric) * 100, 1
          ) as attendance_rate
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id
        WHERE s.class_id = $1 AND s.status = 'active'
        GROUP BY s.id, s.name, s.gender, s.parent_phone
        ORDER BY attendance_rate DESC, unexcused_days ASC, s.name ASC
      `;
      const studentRankRes = await query(studentRankSql, [classId]);

      const rankedStudents = studentRankRes.rows.map((st, idx) => ({
        rank: idx + 1,
        id: st.id,
        name: st.name,
        gender: st.gender,
        parent_phone: st.parent_phone,
        total_days: st.total_days,
        present_days: st.present_days,
        unexcused_days: st.unexcused_days,
        excused_days: st.excused_days,
        late_days: st.late_days,
        missed_hours: st.unexcused_days * 6,
        rate: Number(st.attendance_rate) || 0,
      }));

      rankings = {
        top_students: rankedStudents.filter((st) => st.rate >= 95).slice(0, 10),
        risk_students: rankedStudents.filter((st) => st.unexcused_days >= 3 || st.missed_hours >= 18),
        all_students: rankedStudents,
      };
    }

    // 6. SABABLAR TAQSIMOTI
    let reasonsSql = `
      SELECT reason, COUNT(*)::int as count
      FROM attendance
      WHERE school_id = $1 AND status = 'ABSENT_EXCUSED' AND reason IS NOT NULL
    `;
    const reasonsParams: any[] = [schoolId];
    if (classId) {
      reasonsSql += ` AND class_id = $2`;
      reasonsParams.push(classId);
    }
    reasonsSql += ` GROUP BY reason ORDER BY count DESC LIMIT 6`;
    const reasonsRes = await query(reasonsSql, reasonsParams);

    const reasonsBreakdown = reasonsRes.rows.map((r) => {
      // Normalise key reasons
      let category = r.reason;
      if (r.reason.includes('Kasallik') || r.reason.includes('shamollash') || r.reason.includes('spravka')) {
        category = 'Kasallik (spravka bor)';
      } else if (r.reason.includes('Oila')) {
        category = 'Oilaviy sabab';
      } else if (r.reason.includes('olimpiada') || r.reason.includes('Musobaqa')) {
        category = 'Musobaqa / Olimpiada';
      } else {
        category = r.reason.split(':')[0] || 'Boshqa uzrli sabab';
      }
      return {
        label: category,
        count: r.count,
      };
    });

    const result = {
      date,
      period,
      school_id: schoolId,
      class_id: classId,
      total_students: totalStudents,
      present_count: present,
      unexcused_count: unexcused,
      excused_count: excused,
      late_count: late,
      attendance_rate: currentRate,
      timeline,
      weekdays_analysis: {
        days: weekdaysAnalysis,
        best_day: bestDay ? `${bestDay.dayName} (${bestDay.rate}%)` : 'Seshanba (96%)',
        worst_day: worstDay ? `${worstDay.dayName} (${worstDay.rate}%)` : 'Shanba (88%)',
      },
      rankings,
      reasons_breakdown: reasonsBreakdown,
    };

    setCached(cacheKey, result, 60);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ error: 'Statistika hisoblashda xatolik yuz berdi' }, { status: 500 });
  }
}
