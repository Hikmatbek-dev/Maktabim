import { AcademicQuarter } from './types';

// O'zbekistondagi qat'iy sanali davlat bayramlari (Oy-Kun formati)
export const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Yangi yil bayrami',
  '01-02': 'Yangi yil qo‘shimcha dam olish kuni',
  '03-08': 'Xalqaro xotin-qizlar kuni',
  '03-21': 'Navro‘z umumxalq bayrami',
  '03-22': 'Navro‘z qo‘shimcha dam olish kuni',
  '05-09': 'Xotira va qadrlash kuni',
  '09-01': 'O‘zbekiston Respublikasi Mustaqillik kuni',
  '10-01': 'O‘qituvchi va murabbiylar kuni',
  '12-08': 'O‘zbekiston Respublikasi Konstitutsiyasi kuni',
};

export interface DayCalendarInfo {
  dateStr: string;
  isSchoolDay: boolean;
  type: 'SUNDAY' | 'HOLIDAY' | 'VACATION' | 'SCHOOL_DAY' | 'OFF_SEASON';
  title: string;
  description?: string;
  quarterName?: string;
  badgeClass: string;
}

/**
 * Berilgan sana bo'yicha dars kuni, yakshanba, bayram yoki ta'til ekanligini aniqlash
 */
export function getCalendarDayInfo(
  dateStr: string,
  quarters: AcademicQuarter[] = []
): DayCalendarInfo {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dateObj = new Date(year, month, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Yakshanba

  // 1. Yakshanba tekshiruvi (Har haftalik qat'iy dam olish kuni)
  if (dayOfWeek === 0) {
    return {
      dateStr,
      isSchoolDay: false,
      type: 'SUNDAY',
      title: 'Yakshanba — Dam olish kuni',
      description: 'Haftalik rasmiy dam olish kuni. Davomat olinmaydi.',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    };
  }

  // 2. Davlat bayramlari tekshiruvi
  const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (FIXED_HOLIDAYS[monthDay]) {
    const holidayTitle = FIXED_HOLIDAYS[monthDay];
    return {
      dateStr,
      isSchoolDay: false,
      type: 'HOLIDAY',
      title: `Bayram: ${holidayTitle}`,
      description: 'Rasmiy davlat bayrami munosabati bilan dam olish kuni.',
      badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    };
  }

  // 3. Maktab ma'muriyati belgilagan choraklar va ta'tillarni tekshirish
  if (quarters && quarters.length > 0) {
    // A) Avval ta'til sanalariga to'g'ri keladimi?
    for (const q of quarters) {
      if (q.vacation_start && q.vacation_end) {
        if (dateStr >= q.vacation_start && dateStr <= q.vacation_end) {
          return {
            dateStr,
            isSchoolDay: false,
            type: 'VACATION',
            title: `Taʼtil: ${q.name} yakunidagi taʼtil`,
            description: `${q.name} tugashi munosabati bilan o‘quvchilar uchun rasmiy taʼtil kuni.`,
            quarterName: q.name,
            badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
          };
        }
      }
    }

    // B) Chorak o'qish kunlariga to'g'ri keladimi?
    for (const q of quarters) {
      if (dateStr >= q.start_date && dateStr <= q.end_date) {
        return {
          dateStr,
          isSchoolDay: true,
          type: 'SCHOOL_DAY',
          title: `O‘qish kuni (${q.name})`,
          quarterName: q.name,
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        };
      }
    }
  }

  // Agar choraklar belgilanmagan bo'lsa yoki chorak oralig'idan tashqari bo'lsa
  return {
    dateStr,
    isSchoolDay: true,
    type: 'SCHOOL_DAY',
    title: 'O‘qish kuni',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
}
