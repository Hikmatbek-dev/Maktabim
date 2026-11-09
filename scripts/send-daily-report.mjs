#!/usr/bin/env node

/**
 * Maktabim - Telegram Kunlik Direktor Davomat Hisoboti
 * Uzbekiston / Toshkent vaqti bilan har kuni soat 17:00 da yuboriladi.
 * 
 * Bot Token: 8990180086:AAETGBBuOIPTIg_vdvWRcdVnbTOEM2OsxmM
 * ChatIDlar: 1303759816, 6171556609
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env faylidan sozlamalarni o'qish
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!env[key]) {
            env[key] = val;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const DATABASE_URL = env.DATABASE_URL || 'postgresql://bozkurt:maktabim123@localhost:5432/maktabim_db';
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '8990180086:AAETGBBuOIPTIg_vdvWRcdVnbTOEM2OsxmM';
const DEFAULT_CHAT_IDS = ['1303759816', '6171556609'];

const configuredChatIds = (env.TELEGRAM_DIRECTOR_CHAT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const TARGET_CHAT_IDS = configuredChatIds.length > 0 ? configuredChatIds : DEFAULT_CHAT_IDS;

// Toshkent vaqti bo'yicha sana va vaqt
export function getTashkentDate(d = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // YYYY-MM-DD
}

export function formatUzbekDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const monthsUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  const weekdaysUz = [
    'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'
  ];
  const dayName = weekdaysUz[dt.getUTCDay()];
  const monthName = monthsUz[m - 1];
  return `${d}-${monthName}, ${y}-yil (${dayName})`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendDailyTelegramReport(options = {}) {
  const targetDate = options.date || getTashkentDate();
  const schoolId = options.schoolId || 'sch_1';
  const chatIds = options.chatIds || TARGET_CHAT_IDS;
  const token = options.botToken || TELEGRAM_BOT_TOKEN;

  console.log(`[Telegram Report] Tayyorlanmoqda... Sana: ${targetDate}, Maktab: ${schoolId}`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('maktabim_db') ? false : { rejectUnauthorized: false }
  });

  try {
    // 1. Maktab ma'lumotlari
    const schoolRes = await pool.query(`SELECT id, name, region, district FROM schools WHERE id = $1`, [schoolId]);
    const schoolName = schoolRes.rows[0]?.name || '3-sonli umumiy o‘rta ta’lim maktabi';
    const schoolDistrict = schoolRes.rows[0]?.district || '';

    // 2. Jami faol o'quvchilar soni
    const totalStudentsRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM students WHERE status = 'active' AND school_id = $1`,
      [schoolId]
    );
    const totalStudents = totalStudentsRes.rows[0]?.count || 0;

    // 3. Davomat hisobi (Holatlar)
    const attRes = await pool.query(
      `SELECT status, COUNT(*)::int as count 
       FROM attendance 
       WHERE date = $1 AND school_id = $2
       GROUP BY status`,
      [targetDate, schoolId]
    );

    let present = 0;
    let unexcused = 0;
    let excused = 0;
    let late = 0;

    for (const r of attRes.rows) {
      if (r.status === 'PRESENT') present = r.count;
      else if (r.status === 'ABSENT_UNEXCUSED') unexcused = r.count;
      else if (r.status === 'ABSENT_EXCUSED') excused = r.count;
      else if (r.status === 'LATE') late = r.count;
    }

    const checkedTotal = present + unexcused + excused + late;
    const rate = checkedTotal > 0 ? Math.round(((present + late) / checkedTotal) * 100) : 0;

    // 4. Smenalar bo'yicha davomat
    const shiftRes = await pool.query(
      `SELECT 
        c.shift,
        COUNT(s.id)::int as total_students,
        COUNT(CASE WHEN a.status = 'PRESENT' OR a.status = 'LATE' THEN 1 END)::int as present_students
       FROM classes c
       JOIN students s ON s.class_id = c.id AND s.status = 'active'
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       WHERE c.school_id = $2
       GROUP BY c.shift
       ORDER BY c.shift`,
      [targetDate, schoolId]
    );

    let shift1 = { total: 0, present: 0, rate: 0 };
    let shift2 = { total: 0, present: 0, rate: 0 };

    for (const r of shiftRes.rows) {
      const shiftRate = r.total_students > 0 ? Math.round((r.present_students / r.total_students) * 100) : 0;
      if (r.shift === 1) {
        shift1 = { total: r.total_students, present: r.present_students, rate: shiftRate };
      } else if (r.shift === 2) {
        shift2 = { total: r.total_students, present: r.present_students, rate: shiftRate };
      }
    }

    // 5. Sinflar davomat topshirishi
    const classesRes = await pool.query(
      `SELECT 
        c.id,
        c.name as class_name,
        c.shift,
        c.grade,
        COALESCE(u.name, 'Biriktirilmagan') as teacher_name,
        COUNT(DISTINCT s.id)::int as total_students,
        COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.id END)::int as present_count,
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN a.id END)::int as unexcused_count,
        COUNT(DISTINCT CASE WHEN a.status = 'ABSENT_EXCUSED' THEN a.id END)::int as excused_count,
        COUNT(DISTINCT CASE WHEN a.status = 'LATE' THEN a.id END)::int as late_count,
        CASE WHEN sub.id IS NOT NULL THEN true ELSE false END as is_submitted
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       LEFT JOIN attendance_submissions sub ON sub.class_id = c.id AND sub.date = $1
       WHERE c.school_id = $2
       GROUP BY c.id, c.name, c.shift, c.grade, u.name, sub.id
       ORDER BY c.grade ASC, c.name ASC`,
      [targetDate, schoolId]
    );

    const totalClassesCount = classesRes.rows.length;
    const submittedClasses = classesRes.rows.filter(c => c.is_submitted);
    const pendingClasses = classesRes.rows.filter(c => !c.is_submitted);

    // 6. Bugun sababsiz dars qoldirgan o'quvchilar
    const absentsRes = await pool.query(
      `SELECT 
        c.name as class_name,
        s.name as student_name,
        a.status,
        COALESCE(a.reason, '-') as reason,
        COALESCE(s.parent_name, '-') as parent_name,
        COALESCE(s.parent_phone, '-') as parent_phone
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE a.date = $1 AND a.status IN ('ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE')
         AND c.school_id = $2
       ORDER BY 
         CASE WHEN a.status = 'ABSENT_UNEXCUSED' THEN 1 WHEN a.status = 'ABSENT_EXCUSED' THEN 2 ELSE 3 END,
         c.grade ASC, c.name ASC, s.name ASC`,
      [targetDate, schoolId]
    );

    // 7. Surunkali dars qoldiruvchilar (Risk guruhi)
    const riskStudentsRes = await pool.query(
      `SELECT 
        s.name as student_name,
        c.name as class_name,
        COALESCE(s.parent_phone, '-') as parent_phone,
        COUNT(a.id)::int as unexcused_days,
        (COUNT(a.id)::int * 6) as missed_hours
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE a.status = 'ABSENT_UNEXCUSED' AND a.school_id = $1
       GROUP BY s.id, s.name, c.name, s.parent_phone
       HAVING (COUNT(a.id)::int * 6) >= 36 OR COUNT(a.id)::int >= 6
       ORDER BY missed_hours DESC
       LIMIT 10`,
      [schoolId]
    );

    // ==========================================
    // EXCEL FAYLINI HOSIL QILISH
    // ==========================================
    const workbook = XLSX.utils.book_new();

    // 1-varaqa: Sinflar hisoboti
    const classesRows = classesRes.rows.map(c => {
      const classChecked = c.present_count + c.unexcused_count + c.excused_count + c.late_count;
      const classRate = classChecked > 0 ? Math.round(((c.present_count + c.late_count) / classChecked) * 100) : 0;
      return {
        'Sinf': c.class_name,
        'Smena': c.shift,
        'Sinf rahbari': c.teacher_name,
        'Jami o‘quvchilar': c.total_students,
        'Kelganlar': c.present_count,
        'Sababsiz kelmagan': c.unexcused_count,
        'Sababli kelmagan': c.excused_count,
        'Kechikkanlar': c.late_count,
        'Davomat foizi': `${classRate}%`,
        'Topshirildi': c.is_submitted ? 'Ha (Topshirilgan)' : 'Yo‘q (Topshirilmagan)'
      };
    });
    const wsClasses = XLSX.utils.json_to_sheet(classesRows);
    XLSX.utils.book_append_sheet(workbook, wsClasses, 'Sinflar hisoboti');

    // 2-varaqa: Kelmagan o'quvchilar
    const absentsRows = absentsRes.rows.map(a => ({
      'Sinf': a.class_name,
      'O‘quvchi F.I.Sh': a.student_name,
      'Holati': a.status === 'ABSENT_UNEXCUSED' ? 'Sababsiz kelmadi' : (a.status === 'ABSENT_EXCUSED' ? 'Sababli kelmadi' : 'Kechikdi'),
      'Sabab / Izoh': a.reason,
      'Ota-onasi': a.parent_name,
      'Telefon raqami': a.parent_phone
    }));
    const wsAbsents = XLSX.utils.json_to_sheet(absentsRows.length > 0 ? absentsRows : [{ 'Izoh': 'Bugun dars qoldirgan o‘quvchi yo‘q' }]);
    XLSX.utils.book_append_sheet(workbook, wsAbsents, 'Kelmaganlar');

    // 3-varaqa: Surunkali qoldiruvchilar
    const riskRows = riskStudentsRes.rows.map(r => ({
      'O‘quvchi F.I.Sh': r.student_name,
      'Sinf': r.class_name,
      'Sababsiz kunlar': r.unexcused_days,
      'Qoldirilgan soatlar': `${r.missed_hours} soat`,
      'Ota-onasi telefoni': r.parent_phone
    }));
    const wsRisk = XLSX.utils.json_to_sheet(riskRows.length > 0 ? riskRows : [{ 'Izoh': 'Xavf guruhidagi o‘quvchilar mavjud emas' }]);
    XLSX.utils.book_append_sheet(workbook, wsRisk, 'Surunkali qoldiruvchilar');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // ==========================================
    // TELEGRAM XABAR MATNINI SHAKLLANTIRISH
    // ==========================================
    const formattedDate = formatUzbekDate(targetDate);

    let messageText = `📊 <b>KUNLIK MAKTAB DAVOMAT HISOBOTI</b>\n`;
    messageText += `🏫 <b>${escapeHtml(schoolName)}</b>\n`;
    if (schoolDistrict) {
      messageText += `📍 <i>${escapeHtml(schoolDistrict)}</i>\n`;
    }
    messageText += `📅 <b>Sana:</b> ${formattedDate}\n`;
    messageText += `⏰ <b>Hisobot vaqti:</b> 17:00 (Toshkent vaqti)\n\n`;

    if (checkedTotal === 0 && totalClassesCount > 0 && submittedClasses.length === 0) {
      messageText += `⚠️ <b>DIQQAT:</b> Bugun uchun hali sinflar davomati kiritilmagan (Dam olish kuni yoki dars jadvali bo‘lmagan sana).\n\n`;
      messageText += `👥 <b>Maktabdagi jami o‘quvchilar soni:</b> ${totalStudents} nafar\n`;
      messageText += `📋 <b>Jami sinflar soni:</b> ${totalClassesCount} ta\n`;
    } else {
      messageText += `👥 <b>UMUMIY DAVOMAT KO‘RSATKICHI:</b>\n`;
      messageText += `• <b>Jami o‘quvchilar:</b> ${totalStudents} nafar\n`;
      messageText += `• <b>Davomat ko‘rsatkichi:</b> <b>${rate}%</b>\n`;
      messageText += `• ✅ <b>Kelganlar:</b> ${present} nafar\n`;
      messageText += `• ❌ <b>Sababsiz kelmagan:</b> ${unexcused} nafar\n`;
      messageText += `• 🏥 <b>Sababli kelmagan:</b> ${excused} nafar\n`;
      messageText += `• ⏱ <b>Kechikkanlar:</b> ${late} nafar\n\n`;

      messageText += `🏢 <b>SMENALAR BO‘YICHA:</b>\n`;
      messageText += `• <b>1-smena:</b> ${shift1.present}/${shift1.total} nafar (<b>${shift1.rate}%</b>)\n`;
      messageText += `• <b>2-smena:</b> ${shift2.present}/${shift2.total} nafar (<b>${shift2.rate}%</b>)\n\n`;

      messageText += `📋 <b>SINFLARNING DAVOMAT TOPSHIRISHI:</b>\n`;
      messageText += `• Jami sinflar: <b>${totalClassesCount} ta</b>\n`;
      messageText += `• ✅ Topshirgan: <b>${submittedClasses.length} ta</b> sinf\n`;

      if (pendingClasses.length > 0) {
        const pendingNames = pendingClasses.map(c => c.class_name).join(', ');
        messageText += `• ⚠️ Topshirmagan (<b>${pendingClasses.length} ta</b>): <code>${escapeHtml(pendingNames)}</code>\n\n`;
      } else {
        messageText += `• ✨ <i>Barcha sinflar o‘z vaqtida davomat topshirdi!</i>\n\n`;
      }

      // Sababsiz kelmagan o'quvchilardan namunalar (10 tagacha)
      const unexcusedList = absentsRes.rows.filter(a => a.status === 'ABSENT_UNEXCUSED');
      if (unexcusedList.length > 0) {
        messageText += `❌ <b>BUGUN SABABSIZ KELMAGANLAR (${unexcusedList.length} nafar):</b>\n`;
        const displayLimit = Math.min(10, unexcusedList.length);
        for (let i = 0; i < displayLimit; i++) {
          const item = unexcusedList[i];
          const phone = item.parent_phone && item.parent_phone !== '-' ? ` 📞 ${item.parent_phone}` : '';
          messageText += `${i + 1}. <b>${escapeHtml(item.class_name)}</b> — ${escapeHtml(item.student_name)}${escapeHtml(phone)}\n`;
        }
        if (unexcusedList.length > displayLimit) {
          messageText += `<i>...va yana ${unexcusedList.length - displayLimit} nafar o‘quvchi (to‘liq ro‘yxat ilova qilingan Excel faylda).</i>\n`;
        }
        messageText += `\n`;
      }

      // Surunkali qoldiruvchilar ogohlantirishi
      if (riskStudentsRes.rows.length > 0) {
        messageText += `⚠️ <b>SURUNKALI DARS QOLDIRUVCHILAR (36+ soat / 6+ kun):</b>\n`;
        const displayRiskLimit = Math.min(5, riskStudentsRes.rows.length);
        for (let i = 0; i < displayRiskLimit; i++) {
          const r = riskStudentsRes.rows[i];
          messageText += `• <b>${escapeHtml(r.class_name)}</b> ${escapeHtml(r.student_name)}: <b>${r.missed_hours} soat</b> (${r.unexcused_days} kun)\n`;
        }
        if (riskStudentsRes.rows.length > displayRiskLimit) {
          messageText += `<i>...va yana ${riskStudentsRes.rows.length - displayRiskLimit} nafar xavf guruhidagi o‘quvchi.</i>\n`;
        }
        messageText += `\n`;
      }
    }

    messageText += `📎 <i>Bugungi kunning to‘liq batafsil hisoboti Excel formatida biriktirilgan.</i>`;

    // ==========================================
    // TELEGRAMGA YUBORISH
    // ==========================================
    const results = [];
    const safeSchoolName = schoolName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
    const filename = `Davomat_${safeSchoolName}_${targetDate}.xlsx`;

    for (const chatId of chatIds) {
      console.log(`[Telegram Report] Chat ID: ${chatId} ga yuborilmoqda...`);
      try {
        // 1. Matnli xabarni yuborish
        const textRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });

        const textJson = await textRes.json();
        if (!textJson.ok) {
          throw new Error(textJson.description || 'Xabar yuborishda xatolik');
        }

        // 2. Excel faylni yuborish
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', `📑 ${formattedDate} davomat hisoboti (${schoolName})`);
        const fileBlob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        form.append('document', fileBlob, filename);

        const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: 'POST',
          body: form,
        });
        const docJson = await docRes.json();
        if (!docJson.ok) {
          console.warn(`[Telegram Report] Excel fayl yuborishda ogohlantirish (Chat: ${chatId}):`, docJson.description);
        }

        console.log(`✅ [Telegram Report] Chat ${chatId} ga muvaffaqiyatli yetkazildi!`);
        results.push({ chatId, success: true });
      } catch (err) {
        console.error(`❌ [Telegram Report] Chat ${chatId} ga yuborishda xatolik:`, err.message);
        results.push({ chatId, success: false, error: err.message });
      }
    }

    await pool.end();

    return {
      success: results.some(r => r.success),
      date: targetDate,
      schoolName,
      totalStudents,
      present,
      unexcused,
      excused,
      late,
      rate,
      results,
    };
  } catch (error) {
    console.error('sendDailyTelegramReport fatal error:', error);
    try { await pool.end(); } catch (_) {}
    throw error;
  }
}

// CLI orqali to'g'ridan-to'g'ri ishga tushirilganda
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let customDate = null;
  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      customDate = arg.split('=')[1];
    }
  }

  sendDailyTelegramReport({ date: customDate })
    .then((res) => {
      console.log('Hisobot natijasi:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Xatolik:', err);
      process.exit(1);
    });
}
