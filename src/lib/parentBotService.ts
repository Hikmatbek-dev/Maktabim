import { query } from '@/lib/db';
import { getCalendarDayInfo } from '@/lib/academicCalendar';
import { AcademicQuarter } from '@/lib/types';

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_PARENT_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  '9204379482:AAG52nMv0V3GaOxNrij5a-JgWaHRDEQkYXo';

let isTablesChecked = false;

/**
 * Jadvallarni avtomatik tekshirish va yaratish (Vercel va Cloud DB uchun)
 */
export async function ensureParentTablesExist() {
  if (isTablesChecked) return;
  try {
    await query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_code VARCHAR(32);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_students_parent_code ON students(parent_code) WHERE parent_code IS NOT NULL;
      
      UPDATE students 
      SET parent_code = LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0') 
      WHERE parent_code IS NULL;

      CREATE TABLE IF NOT EXISTS parent_telegram_users (
        telegram_id BIGINT PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        username VARCHAR(255),
        phone_number VARCHAR(50),
        active_student_id VARCHAR(50),
        notification_enabled BOOLEAN DEFAULT true,
        state VARCHAR(50) DEFAULT 'IDLE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS parent_student_links (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT,
        student_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(telegram_id, student_id)
      );
    `);
    isTablesChecked = true;
  } catch (err) {
    console.error('ensureParentTablesExist error:', err);
  }
}

export interface TelegramFromUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramFromUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramFromUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/**
 * Telegram API ga to'g'ridan-to'g'ri so'rov yuborish
 */
export async function callTelegramApi(method: string, body: Record<string, any>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Telegram API error in ${method}:`, data);
    }
    return data;
  } catch (err) {
    console.error(`Failed to call Telegram API ${method}:`, err);
    return null;
  }
}

/**
 * Xabarni yuborish
 */
export async function sendTelegramMessage(chatId: number | string, text: string, extra: Record<string, any> = {}) {
  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

/**
 * Callback query ga javob qaytarish (tugma bosilgandagi soat belgisi ketishi uchun)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Ota-ona foydalanuvchisini olish yoki yaratish
 */
export async function getOrCreateParentUser(from: TelegramFromUser) {
  const res = await query(
    `SELECT * FROM parent_telegram_users WHERE telegram_id = $1`,
    [from.id]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  const insertRes = await query(
    `INSERT INTO parent_telegram_users (telegram_id, first_name, last_name, username, state)
     VALUES ($1, $2, $3, $4, 'IDLE')
     RETURNING *`,
    [from.id, from.first_name || '', from.last_name || '', from.username || '']
  );

  return insertRes.rows[0];
}

/**
 * Ota-onaga biriktirilgan barcha farzandlarni olish
 */
export async function getLinkedStudents(telegramId: number | string) {
  const res = await query(
    `SELECT s.id, s.name, s.gender, s.parent_code, s.parent_phone,
            c.id as class_id, c.name as class_name, c.shift,
            sch.name as school_name, sch.id as school_id
     FROM parent_student_links psl
     JOIN students s ON s.id = psl.student_id
     JOIN classes c ON c.id = s.class_id
     JOIN schools sch ON sch.id = s.school_id
     WHERE psl.telegram_id = $1
     ORDER BY s.name ASC`,
    [telegramId]
  );
  return res.rows;
}

/**
 * Ota-onaning hozirgi faol farzandini olish
 */
export async function getActiveStudent(telegramId: number | string) {
  const userRes = await query(
    `SELECT active_student_id FROM parent_telegram_users WHERE telegram_id = $1`,
    [telegramId]
  );

  const activeId = userRes.rows[0]?.active_student_id;
  const linked = await getLinkedStudents(telegramId);

  if (linked.length === 0) return null;

  if (activeId) {
    const current = linked.find((s) => s.id === activeId);
    if (current) return current;
  }

  // Agar faol belgilanmagan bo'lsa, birinchisini faol qilib saqlaymiz
  const first = linked[0];
  await query(
    `UPDATE parent_telegram_users SET active_student_id = $1 WHERE telegram_id = $2`,
    [first.id, telegramId]
  );
  return first;
}

/**
 * Asosiy menyu klaviaturasini chiqarish
 */
export async function sendMainMenu(chatId: number | string, telegramUser: any, customText?: string) {
  const linked = await getLinkedStudents(chatId);
  const activeStudent = await getActiveStudent(chatId);

  let statusHeader = '';
  if (activeStudent) {
    statusHeader = `👤 <b>Faol farzand:</b> ${activeStudent.name} (${activeStudent.class_name})\n\n`;
  } else {
    statusHeader = `⚠️ <i>Hozircha hech qanday farzand ulanmagan.</i>\n\n`;
  }

  const defaultText = `${statusHeader}Quyidagi menyulardan birini tanlang:`;
  const notificationText = telegramUser.notification_enabled !== false ? '🔔 Xabarnoma (Yoqilgan)' : '🔕 Xabarnoma (O‘chirilgan)';

  const keyboard = {
    keyboard: [
      [{ text: '📊 Bugungi davomat' }, { text: '📅 Oylik davomat' }],
      [{ text: '👨‍👩‍👧 Farzandlarim' }, { text: '➕ Farzand qo‘shish' }],
      [{ text: '📢 Maktab yangiliklari' }, { text: notificationText }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };

  return await sendTelegramMessage(chatId, (customText || '') + (customText ? '\n\n' : '') + defaultText, {
    reply_markup: keyboard,
  });
}

/**
 * Telefon raqam orqali farzandlarni avtomatik qidirish va ulash
 */
export async function linkStudentsByPhone(telegramId: number, rawPhone: string) {
  // O'zbekiston raqamining oxirgi 9 ta raqamini ajratib olamiz
  const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
  const last9 = cleanDigits.slice(-9);

  if (last9.length < 9) {
    return [];
  }

  // Bazadan shu telefon raqami mos keluvchi o'quvchilarni topish
  const res = await query(
    `SELECT s.id, s.name, c.name as class_name, s.parent_name
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '[^0-9]', '', 'g'), 9) = $1`,
    [last9]
  );

  const matchedStudents = res.rows;

  if (matchedStudents.length > 0) {
    for (const st of matchedStudents) {
      await query(
        `INSERT INTO parent_student_links (telegram_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (telegram_id, student_id) DO NOTHING`,
        [telegramId, st.id]
      );
    }

    // Birinchisini faol qilib belgilaymiz
    await query(
      `UPDATE parent_telegram_users 
       SET active_student_id = COALESCE(active_student_id, $1),
           phone_number = $2,
           state = 'IDLE',
           updated_at = NOW()
       WHERE telegram_id = $3`,
      [matchedStudents[0].id, rawPhone, telegramId]
    );
  }

  return matchedStudents;
}

/**
 * Maxfiy 6 xonali kod orqali farzandni ulash
 */
export async function linkStudentByCode(telegramId: number, inputCode: string) {
  const cleanCode = inputCode.trim();
  const res = await query(
    `SELECT s.id, s.name, c.name as class_name, sch.name as school_name
     FROM students s
     JOIN classes c ON c.id = s.class_id
     JOIN schools sch ON sch.id = s.school_id
     WHERE s.parent_code = $1`,
    [cleanCode]
  );

  if (res.rows.length === 0) {
    return { success: false, message: 'Bunday 6 xonali kodga ega o‘quvchi topilmadi.' };
  }

  const student = res.rows[0];

  await query(
    `INSERT INTO parent_student_links (telegram_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT (telegram_id, student_id) DO NOTHING`,
    [telegramId, student.id]
  );

  await query(
    `UPDATE parent_telegram_users 
     SET active_student_id = $1,
         state = 'IDLE',
         updated_at = NOW()
     WHERE telegram_id = $2`,
    [student.id, telegramId]
  );

  return { success: true, student };
}

/**
 * Toshkent vaqti bilan sanani olish
 */
export function getTodayDateString(): string {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Bugungi davomatni ko'rsatish
 */
export async function handleTodayAttendance(chatId: number) {
  const activeStudent = await getActiveStudent(chatId);
  if (!activeStudent) {
    return await sendTelegramMessage(
      chatId,
      `⚠️ <b>Sizga biriktirilgan farzand topilmadi!</b>\n\nIltimos, avval <b>[➕ Farzand qo‘shish]</b> tugmasini bosib, 6 xonali kod orqali farzandingizni ulang.`
    );
  }

  const todayStr = getTodayDateString();

  // Chorak va ta'tillarni olish
  const qRes = await query(
    `SELECT * FROM academic_quarters WHERE school_id = $1 ORDER BY quarter_number ASC`,
    [activeStudent.school_id]
  );
  const quarters: AcademicQuarter[] = qRes.rows;

  const dayInfo = getCalendarDayInfo(todayStr, quarters);

  // Agar dam olish kuni bo'lsa
  if (!dayInfo.isSchoolDay) {
    return await sendTelegramMessage(
      chatId,
      `👤 Farzand: <b>${activeStudent.name}</b> (${activeStudent.class_name})\n` +
      `📅 Sana: <b>${todayStr}</b>\n\n` +
      `🏖 <b>${dayInfo.title}</b>\n` +
      `<i>${dayInfo.description || 'Bugun maktabda dars yo‘q. Davomat olinmaydi.'}</i>`
    );
  }

  // Bugungi davomat yozuvini tekshirish
  const attRes = await query(
    `SELECT a.status, a.reason, a.notes, a.updated_at,
            sub.status as submission_status
     FROM attendance a
     LEFT JOIN attendance_submissions sub ON sub.class_id = a.class_id AND sub.date = a.date
     WHERE a.student_id = $1 AND a.date = $2`,
    [activeStudent.id, todayStr]
  );

  let statusText = '⚪ Davomat hali olinmagan (Kutilmoqda)';
  let extraNotes = '';

  if (attRes.rows.length > 0) {
    const row = attRes.rows[0];
    switch (row.status) {
      case 'PRESENT':
        statusText = '🟢 <b>Darsda (Kelgan)</b>';
        break;
      case 'ABSENT_UNEXCUSED':
        statusText = '🔴 <b>Darsda yo‘q (Sababsiz kelmagan)</b>';
        break;
      case 'ABSENT_EXCUSED':
        statusText = `🟡 <b>Sababli kelmagan</b>${row.reason ? `\nSabab: <i>${row.reason}</i>` : ''}`;
        break;
      case 'LATE':
        statusText = '🟠 <b>Darsga kechikib kelgan</b>';
        break;
    }
  }

  const message = 
    `📊 <b>Bugungi davomat holati</b>\n\n` +
    `👤 Farzand: <b>${activeStudent.name}</b>\n` +
    `🏫 Sinf: <b>${activeStudent.class_name}</b>\n` +
    `📅 Sana: <b>${todayStr}</b>\n\n` +
    `📌 Holat: ${statusText}${extraNotes}`;

  return await sendTelegramMessage(chatId, message);
}

/**
 * Oylik davomat statistikasini ko'rsatish
 */
export async function handleMonthlyAttendance(chatId: number) {
  const activeStudent = await getActiveStudent(chatId);
  if (!activeStudent) {
    return await sendTelegramMessage(
      chatId,
      `⚠️ <b>Sizga biriktirilgan farzand topilmadi!</b>\n\nIltimos, <b>[➕ Farzand qo‘shish]</b> tugmasini bosing.`
    );
  }

  const todayStr = getTodayDateString();
  const [yearStr, monthStr] = todayStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  const currentMonthName = monthNames[month - 1];

  // Choraklarni olish
  const qRes = await query(
    `SELECT * FROM academic_quarters WHERE school_id = $1 ORDER BY quarter_number ASC`,
    [activeStudent.school_id]
  );
  const quarters: AcademicQuarter[] = qRes.rows;

  // Joriy oydagi barcha davomat yozuvlari
  const startDate = `${yearStr}-${monthStr}-01`;
  const endDate = `${yearStr}-${monthStr}-31`;

  const attRes = await query(
    `SELECT date, status, reason 
     FROM attendance 
     WHERE student_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date DESC`,
    [activeStudent.id, startDate, endDate]
  );

  const map: Record<string, any> = {};
  attRes.rows.forEach((r) => {
    const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date.toISOString().split('T')[0];
    map[dStr] = r;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  let keldi = 0;
  let kelmadi = 0;
  let kechikdi = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const info = getCalendarDayInfo(dayStr, quarters);
    if (!info.isSchoolDay) continue;

    const record = map[dayStr];
    if (record) {
      if (record.status === 'PRESENT') keldi++;
      else if (record.status === 'ABSENT_UNEXCUSED' || record.status === 'ABSENT_EXCUSED') kelmadi++;
      else if (record.status === 'LATE') kechikdi++;
    }
  }

  // Oxirgi 10 ta dars kunining holati
  let historyList = '';
  const recentDays = attRes.rows.slice(0, 8);
  if (recentDays.length > 0) {
    historyList = '\n<b>Oxirgi darslardagi holat:</b>\n';
    recentDays.forEach((r) => {
      const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date.toISOString().split('T')[0];
      const icon = r.status === 'PRESENT' ? '🟢 Kelgan' : r.status === 'LATE' ? '🟠 Kechikkan' : '🔴 Kelmagan';
      historyList += `• ${dStr}: ${icon}\n`;
    });
  }

  const message =
    `📅 <b>Oylik Davomat Hisoboti</b>\n\n` +
    `👤 Farzand: <b>${activeStudent.name}</b> (${activeStudent.class_name})\n` +
    `🗓 Oy: <b>${currentMonthName} ${year}</b>\n\n` +
    `✅ <b>Kelgan kunlar:</b> ${keldi} kun\n` +
    `❌ <b>Kelmagan kunlar:</b> ${kelmadi} kun\n` +
    `⚠️ <b>Kechikkan:</b> ${kechikdi} marta\n` +
    historyList +
    `\n<i>Eslatma: Yakshanbalar, bayramlar va taʼtillar kelmadi hisobiga kiritilmaydi.</i>`;

  return await sendTelegramMessage(chatId, message);
}

/**
 * Farzandlarni ko'rish va almashtirish tugmalarini chiqarish
 */
export async function handleMyChildren(chatId: number) {
  const linked = await getLinkedStudents(chatId);
  const activeStudent = await getActiveStudent(chatId);

  if (linked.length === 0) {
    return await sendTelegramMessage(
      chatId,
      `⚠️ <b>Hozircha hech qanday farzand ulanmagan!</b>\n\n` +
      `Farzandingizni ulash uchun pastdagi <b>[➕ Farzand qo‘shish]</b> tugmasini bosing va 6 xonali maxfiy kodni kiriting.`
    );
  }

  let text = `👨‍👩‍👧 <b>Sizga biriktirilgan farzandlar (${linked.length} ta):</b>\n\n`;
  const inlineButtons: any[] = [];

  linked.forEach((st, idx) => {
    const isActive = activeStudent && activeStudent.id === st.id;
    const mark = isActive ? '✅ [Faol]' : '';
    text += `${idx + 1}. <b>${st.name}</b> — ${st.class_name} sinfi ${mark}\n`;
    text += `   🔑 Ulanish kodi: <code>${st.parent_code}</code>\n\n`;

    const btnText = `${isActive ? '✅ ' : ''}${st.name.split(' ')[0]} (${st.class_name})`;
    inlineButtons.push([{ text: btnText, callback_data: `select_child:${st.id}` }]);
  });

  inlineButtons.push([{ text: '➕ Yangi farzand qo‘shish', callback_data: 'action_add_child' }]);

  text += `<i>Farzandni almashtirish uchun quyidagi tugmalardan birini bosing:</i>`;

  return await sendTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: inlineButtons,
    },
  });
}

/**
 * Maktab yangiliklari va ta'tillar
 */
export async function handleSchoolNews(chatId: number) {
  const activeStudent = await getActiveStudent(chatId);
  const schoolId = activeStudent?.school_id || 'sch_1';

  const qRes = await query(
    `SELECT * FROM academic_quarters WHERE school_id = $1 ORDER BY quarter_number ASC`,
    [schoolId]
  );
  const quarters: AcademicQuarter[] = qRes.rows;

  let text = `📢 <b>Maktab va O‘quv Yili Maʼlumotlari</b>\n\n`;

  if (quarters.length > 0) {
    text += `📅 <b>Choraklar va Taʼtillar jadvali:</b>\n`;
    quarters.forEach((q) => {
      text += `\n📌 <b>${q.name}:</b> ${q.start_date} dan ${q.end_date} gacha\n`;
      if (q.vacation_start && q.vacation_end) {
        text += `   🏖 <i>Taʼtil:</i> ${q.vacation_start} dan ${q.vacation_end} gacha\n`;
      }
    });
  }

  text += `\n📞 <b>Maktab maʼmuriyati:</b> Savol va murojaatlar bo‘yicha sinf rahbaringizga murojaat qilishingiz mumkin.`;

  return await sendTelegramMessage(chatId, text);
}

/**
 * Xabarnomani yoqish/o'chirishni almashtirish
 */
export async function handleToggleNotifications(chatId: number) {
  const user = await query(`SELECT notification_enabled FROM parent_telegram_users WHERE telegram_id = $1`, [chatId]);
  const current = user.rows[0]?.notification_enabled !== false;
  const nextVal = !current;

  await query(
    `UPDATE parent_telegram_users SET notification_enabled = $1 WHERE telegram_id = $2`,
    [nextVal, chatId]
  );

  const statusText = nextVal ? '✅ <b>Xabarnomalar yoqildi!</b> Endi farzandingiz davomati haqida tezkor bildirishnomalar olasiz.' : '🔕 <b>Xabarnomalar o‘chirildi.</b>';
  const updatedUser = { notification_enabled: nextVal };
  return await sendMainMenu(chatId, updatedUser, statusText);
}

/**
 * Asosiy Telegram Update larini qayta ishlash
 */
export async function processTelegramUpdate(update: TelegramUpdate) {
  try {
    // Bazadagi jadvallar mavjudligini ta'minlash
    await ensureParentTablesExist();

    // 1. Tugma bosilganda (Callback Query)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.from.id;

      if (data.startsWith('select_child:')) {
        const studentId = data.replace('select_child:', '');
        const linked = await getLinkedStudents(chatId);
        const target = linked.find((s) => s.id === studentId);

        if (target) {
          await query(
            `UPDATE parent_telegram_users SET active_student_id = $1 WHERE telegram_id = $2`,
            [studentId, chatId]
          );
          await answerCallbackQuery(cq.id, `Faol farzand almashtirildi: ${target.name}`);
          const pUser = await getOrCreateParentUser(cq.from);
          await sendMainMenu(chatId, pUser, `✅ Faol farzand muvaffaqiyatli tanlandi: <b>${target.name}</b> (${target.class_name})`);
        } else {
          await answerCallbackQuery(cq.id, 'Ushbu farzand sizga biriktirilmagan!', true);
        }
        return;
      }

      if (data === 'action_add_child') {
        await query(`UPDATE parent_telegram_users SET state = 'AWAITING_STUDENT_CODE' WHERE telegram_id = $1`, [chatId]);
        await answerCallbackQuery(cq.id);
        await sendTelegramMessage(
          chatId,
          `➕ <b>Yangi farzandni ulash:</b>\n\nFarzandingizning <b>6 xonali maxfiy kodini</b> kiriting:\n(Ushbu kodni sinf rahbaridan olishingiz mumkin, masalan: <code>496325</code>)\n\n<i>Bekor qilish uchun /cancel deb yozing.</i>`
        );
        return;
      }
    }

    // 2. Xabar kelganda (Message)
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text?.trim() || '';
    const from = msg.from;
    if (!from) return;

    const parentUser = await getOrCreateParentUser(from);

    // Kontakt yuborilganda
    if (msg.contact) {
      const phone = msg.contact.phone_number;
      const matched = await linkStudentsByPhone(from.id, phone);

      if (matched.length > 0) {
        let successMsg = `🎉 <b>Tabriklaymiz! Raqamingiz orqali ${matched.length} ta farzand topildi va ulandi:</b>\n\n`;
        matched.forEach((st, i) => {
          successMsg += `${i + 1}. <b>${st.name}</b> (${st.class_name} sinfi)\n`;
        });
        const updatedUser = await getOrCreateParentUser(from);
        return await sendMainMenu(chatId, updatedUser, successMsg);
      } else {
        await query(`UPDATE parent_telegram_users SET phone_number = $1, state = 'AWAITING_STUDENT_CODE' WHERE telegram_id = $2`, [phone, from.id]);
        return await sendTelegramMessage(
          chatId,
          `ℹ️ Siz yuborgan <b>${phone}</b> raqamiga maktab bazasidan avtomatik o‘quvchi topilmadi.\n\n` +
          `Lekin xavotir olmang! Farzandingizning <b>6 xonali maxfiy kodini</b> kiriting (Sinf rahbaridan so‘rashingiz mumkin):\n` +
          `Masalan: <code>496325</code>`
        );
      }
    }

    // /start komandasi
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1 && /^\d{6}$/.test(parts[1].trim())) {
        // Deeplink orqali kod uzatilgan bo'lsa (masalan: /start 496325)
        const code = parts[1].trim();
        const linkResult = await linkStudentByCode(from.id, code);
        if (linkResult.success) {
          const updatedUser = await getOrCreateParentUser(from);
          return await sendMainMenu(
            chatId,
            updatedUser,
            `🎉 <b>Muvaffaqiyatli ulandi!</b>\n\nFarzand: <b>${linkResult.student.name}</b>\nSinf: <b>${linkResult.student.class_name}</b>\nMaktab: <b>${linkResult.student.school_name}</b>\n\nEndi uning barcha davomat maʼlumotlarini kuzatishingiz mumkin!`
          );
        }
      }

      const linked = await getLinkedStudents(from.id);

      if (linked.length === 0) {
        await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
        return await sendTelegramMessage(
          chatId,
          `Assalomu alaykum, <b>${from.first_name || 'Hurmatli Ota-ona'}</b>! 🎓\n\n` +
          `<b>Maktabim</b> — Ota-onalar tizimiga xush kelibsiz!\n\n` +
          `Farzandingizning kunlik va oylik davomatini kuzatish uchun iltimos, pastdagi tugma orqali <b>telefon raqamingizni tasdiqlang</b> yoki <b>6 xonali kod</b> orqali ulang:`,
          {
            reply_markup: {
              keyboard: [
                [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
                [{ text: '🔑 6 xonali kod orqali ulanish' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
        );
      }

      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await sendMainMenu(chatId, parentUser);
    }

    // /cancel komandasi
    if (text === '/cancel' || text.toLowerCase() === 'bekor qilish') {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await sendMainMenu(chatId, parentUser, 'Bekor qilindi.');
    }

    // Kod orqali ulanish tugmasi
    if (text === '🔑 6 xonali kod orqali ulanish' || text === '➕ Farzand qo‘shish') {
      await query(`UPDATE parent_telegram_users SET state = 'AWAITING_STUDENT_CODE' WHERE telegram_id = $1`, [from.id]);
      return await sendTelegramMessage(
        chatId,
        `🔑 <b>Farzandni ulash:</b>\n\nFarzandingizning <b>6 xonali maxfiy kodini</b> kiriting:\n(Ushbu kodni sinf rahbaridan olishingiz mumkin, masalan: <code>496325</code>)\n\n<i>Bekor qilish uchun /cancel deb yozing.</i>`
      );
    }

    // Asosiy menyu tugmalari bosilganda holatni tozalaymiz va tegishli funksiyani chaqiramiz
    if (text === '📊 Bugungi davomat') {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await handleTodayAttendance(chatId);
    }

    if (text === '📅 Oylik davomat') {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await handleMonthlyAttendance(chatId);
    }

    if (text === '👨‍👩‍👧 Farzandlarim') {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await handleMyChildren(chatId);
    }

    if (text === '📢 Maktab yangiliklari') {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await handleSchoolNews(chatId);
    }

    if (text.startsWith('🔔 Xabarnoma') || text.startsWith('🔕 Xabarnoma')) {
      await query(`UPDATE parent_telegram_users SET state = 'IDLE' WHERE telegram_id = $1`, [from.id]);
      return await handleToggleNotifications(chatId);
    }

    // Agar ota-ona hozir kod kiritish holatida bo'lsa yoki to'g'ridan-to'g'ri 6 xonali son yozsa
    if (parentUser.state === 'AWAITING_STUDENT_CODE' || /^\d{6}$/.test(text)) {
      if (/^\d{6}$/.test(text)) {
        const linkResult = await linkStudentByCode(from.id, text);
        if (linkResult.success) {
          const updatedUser = await getOrCreateParentUser(from);
          return await sendMainMenu(
            chatId,
            updatedUser,
            `🎉 <b>Muvaffaqiyatli ulandi!</b>\n\nFarzand: <b>${linkResult.student.name}</b>\nSinf: <b>${linkResult.student.class_name}</b>\nMaktab: <b>${linkResult.student.school_name}</b>\n\nEndi uning barcha davomat maʼlumotlarini kuzatishingiz mumkin!`
          );
        } else {
          return await sendTelegramMessage(
            chatId,
            `❌ <b>Bunday 6 xonali kod topilmadi.</b>\n\nIltimos, kodni tekshirib qaytadan kiriting yoki sinf rahbariga murojaat qiling.\n\n<i>Bekor qilish uchun /cancel deb yozing.</i>`
          );
        }
      } else {
        return await sendTelegramMessage(
          chatId,
          `⚠️ Kod 6 ta raqamdan iborat bo‘lishi kerak (Masalan: <code>496325</code>).\n\nIltimos, to‘g‘ri kodni kiriting yoki bekor qilish uchun /cancel deb yozing.`
        );
      }
    }

    // Default holat: menyuni qayta yuborish
    return await sendMainMenu(chatId, parentUser);

  } catch (err) {
    console.error('Error in processTelegramUpdate:', err);
  }
}

/**
 * Davomat topshirilganda darsga kelmagan yoki kechikkan o'quvchilarning
 * ota-onalariga tezkor xabarnoma (Notification trigger) yuborish
 */
export async function notifyParentsOnAttendanceSubmit(classId: string, date: string) {
  try {
    // 1. Shu sinfning shu sanada darsda bo'lmagan yoki kechikkan o'quvchilarini olish
    const attRes = await query(
      `SELECT a.student_id, a.status, a.reason, s.name as student_name, c.name as class_name, sch.name as school_name
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = a.class_id
       JOIN schools sch ON sch.id = c.school_id
       WHERE a.class_id = $1 AND a.date = $2 AND a.status IN ('ABSENT_UNEXCUSED', 'ABSENT_EXCUSED', 'LATE')`,
      [classId, date]
    );

    if (attRes.rows.length === 0) return;

    // 2. Har bir o'quvchining ulangan ota-onalariga xabar yuborish
    for (const record of attRes.rows) {
      const parentsRes = await query(
        `SELECT ptu.telegram_id, ptu.first_name, ptu.notification_enabled
         FROM parent_student_links psl
         JOIN parent_telegram_users ptu ON ptu.telegram_id = psl.telegram_id
         WHERE psl.student_id = $1 AND ptu.notification_enabled != false`,
        [record.student_id]
      );

      let statusMsg = '';
      if (record.status === 'ABSENT_UNEXCUSED') {
        statusMsg = '🔴 <b>bugun darsga kelmadi (Sababsiz)</b>';
      } else if (record.status === 'ABSENT_EXCUSED') {
        statusMsg = `🟡 <b>bugun darsga kelmadi (Sababli: ${record.reason || 'Qayd etilgan'})</b>`;
      } else if (record.status === 'LATE') {
        statusMsg = '🟠 <b>bugun darsga kechikib keldi</b>';
      }

      const alertText = 
        `⚠️ <b>Maktabim — Tezkor Davomat Xabarnomasi</b>\n\n` +
        `Hurmatli ota-ona!\n` +
        `Farzandingiz <b>${record.student_name}</b> (${record.class_name}) ${statusMsg}.\n\n` +
        `📅 Sana: <b>${date}</b>\n` +
        `🏫 Maktab: ${record.school_name}\n\n` +
        `<i>Agar biron sabab yoki savolingiz bo‘lsa, iltimos, sinf rahbariga xabar bering.</i>`;

      for (const parent of parentsRes.rows) {
        await sendTelegramMessage(parent.telegram_id, alertText);
      }
    }
  } catch (err) {
    console.error('Error notifying parents on attendance submit:', err);
  }
}
