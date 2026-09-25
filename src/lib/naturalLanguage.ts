import { ParsedQuickAdd } from '../types';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const pad = (n: number) => String(n).padStart(2, '0');

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseQuickAdd(rawInput: string): ParsedQuickAdd {
  let text = ` ${rawInput} `;
  let listName: string | null = null;
  let priority = 0;
  let date: string | null = null;
  let time: string | null = null;

  // 1. Extract #list
  text = text.replace(/\s#([a-zA-Z0-9_\-]+)(?=\s)/, (_, name) => {
    listName = name;
    return ' ';
  });

  // 2. Extract priority (!1, !2, !3 or !, !!, !!!)
  text = text.replace(/\s(!{1,3}|![123])(?=\s)/, (_, p) => {
    if (p.startsWith('!') && p.length === 2 && ['1', '2', '3'].includes(p[1])) {
      priority = parseInt(p[1], 10);
    } else {
      // ! -> 3 (Low), !! -> 2 (Medium), !!! -> 1 (High)
      priority = 4 - p.length;
    }
    return ' ';
  });

  // 3. Extract time (@9am, @14:30, 9am, 10:15pm)
  const parseTime = (hStr: string, mStr?: string, ap?: string): string | null => {
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (ap) {
      const lower = ap.toLowerCase();
      if (lower === 'pm' && h < 12) h += 12;
      if (lower === 'am' && h === 12) h = 0;
    }
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  };

  text = text.replace(/\s@(\d{1,2})(?::(\d{2}))?\s?(am|pm)?(?=\s)/i, (match, h, m, ap) => {
    const t = parseTime(h, m, ap);
    if (t) {
      time = t;
      return ' ';
    }
    return match;
  });

  if (!time) {
    text = text.replace(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/i, (match, h, m, ap) => {
      const t = parseTime(h, m, ap);
      if (t) {
        time = t;
        return ' ';
      }
      return match;
    });
  }

  // 4. Extract dates
  const now = new Date();

  // "today"
  if (/\btoday\b/i.test(text)) {
    date = toDateString(now);
    text = text.replace(/\btoday\b/i, ' ');
  }
  // "tomorrow"
  else if (/\btomorrow\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    date = toDateString(d);
    text = text.replace(/\btomorrow\b/i, ' ');
  }
  // "in X days"
  else if (/\bin\s+(\d+)\s+days?\b/i.test(text)) {
    text = text.replace(/\bin\s+(\d+)\s+days?\b/i, (_, count) => {
      const d = new Date(now);
      d.setDate(d.getDate() + parseInt(count, 10));
      date = toDateString(d);
      return ' ';
    });
  }

  // Weekdays: "next monday", "this friday", "friday"
  if (!date) {
    const weekdayRegex = /\b(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
    const match = text.match(weekdayRegex);
    if (match) {
      const targetDay = WEEKDAYS[match[1].toLowerCase()];
      if (targetDay !== undefined) {
        const d = new Date(now);
        let diff = (targetDay - d.getDay() + 7) % 7;
        if (diff === 0) diff = 7; // if today is Friday and user says "friday", treat as next Friday
        d.setDate(d.getDate() + diff);
        date = toDateString(d);
        text = text.replace(match[0], ' ');
      }
    }
  }

  // Month + Day: "dec 25", "25 dec", "march 15th"
  if (!date) {
    const monthRegex = /\b(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december))\b/i;
    const match = text.match(monthRegex);
    if (match) {
      const mStr = (match[1] || match[4]).toLowerCase();
      const dStr = match[2] || match[3];
      const monthIdx = MONTHS[mStr];
      const day = parseInt(dStr, 10);
      if (monthIdx !== undefined && day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), monthIdx, day);
        if (d < now) {
          // Date in the past this year, move to next year
          d.setFullYear(now.getFullYear() + 1);
        }
        date = toDateString(d);
        text = text.replace(match[0], ' ');
      }
    }
  }

  // Construct ISO due_at and reminder_at
  let due_at: string | null = null;
  let reminder_at: string | null = null;

  if (date && time) {
    const dt = new Date(`${date}T${time}:00`);
    if (!isNaN(dt.getTime())) {
      due_at = dt.toISOString();
      reminder_at = due_at;
    }
  } else if (date) {
    due_at = date;
  } else if (time) {
    // If only time was provided without a date, assume today (or tomorrow if time already passed)
    const todayStr = toDateString(now);
    const dt = new Date(`${todayStr}T${time}:00`);
    if (!isNaN(dt.getTime())) {
      if (dt < now) {
        dt.setDate(dt.getDate() + 1);
      }
      due_at = dt.toISOString();
      reminder_at = due_at;
      date = toDateString(dt);
    }
  }

  const title = text.replace(/\s+/g, ' ').trim();

  return {
    title,
    listName,
    priority,
    date,
    time,
    due_at,
    reminder_at,
  };
}
