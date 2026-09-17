/**
 * 日历文件：每位村民的生日（公历按年重复，农历逐年算出）+ 自定义提醒。
 */
import type { Person, Quest } from '@/db/types';
import { birthdayDatesInYear } from '@/lib/birthday';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function nextDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function fold(line: string): string {
  // RFC 5545：每行不超过 75 字节，按字符粗略折行
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer_len(cur + ch) > 72) {
      out.push(cur);
      cur = ' ' + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}
function Buffer_len(s: string): number {
  return new TextEncoder().encode(s).length;
}

function event(uid: string, start: Date, summary: string, description: string, opts: { yearly?: boolean; alarmDaysBefore?: number; stamp: string }): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(start))}`,
    fold(`SUMMARY:${esc(summary)}`),
    fold(`DESCRIPTION:${esc(description)}`),
    'TRANSP:TRANSPARENT',
  ];
  if (opts.yearly) lines.push('RRULE:FREQ=YEARLY');
  if (opts.alarmDaysBefore != null) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(summary)}`), `TRIGGER:-P${opts.alarmDaysBefore}DT15H`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function buildIcs(persons: Person[], quests: Quest[], now = new Date(), lunarYears = 10): string {
  const stamp = `${ymd(now)}T${pad(now.getHours())}${pad(now.getMinutes())}00`;
  const events: string[] = [];
  const thisYear = now.getFullYear();
  for (const p of persons) {
    if (!p.birth || p.isMe) continue;
    const name = p.nickname || p.name;
    // 公历：一条按年重复；农历：逐年一条
    const solar = birthdayDatesInYear(p.birth, thisYear).find((b) => b.calendar === 'solar');
    if (solar) {
      const start = solar.date < new Date(thisYear, now.getMonth(), now.getDate()) ? birthdayDatesInYear(p.birth, thisYear + 1).find((b) => b.calendar === 'solar')!.date : solar.date;
      events.push(event(`birthday-solar-${p.id}@renqing-village`, start, `${name} 的生日`, `人情村 · 生日当天送礼 ×8`, { yearly: true, alarmDaysBefore: 3, stamp }));
    }
    for (let y = thisYear; y < thisYear + lunarYears; y++) {
      const lunar = birthdayDatesInYear(p.birth, y).find((b) => b.calendar === 'lunar');
      if (!lunar) continue;
      if (y === thisYear && lunar.date < new Date(thisYear, now.getMonth(), now.getDate())) continue;
      events.push(event(`birthday-lunar-${p.id}-${y}@renqing-village`, lunar.date, `${name} 的农历生日`, `人情村 · 农历生日`, { alarmDaysBefore: 3, stamp }));
    }
  }
  for (const q of quests) {
    if (q.kind !== 'custom' || q.status !== 'open' || !q.dueDate) continue;
    const [y, m, d] = q.dueDate.split('-').map(Number);
    const p = persons.find((x) => x.id === q.personId);
    events.push(event(`reminder-${q.id}@renqing-village`, new Date(y, m - 1, d), q.title, `人情村提醒${p ? ` · ${p.nickname || p.name}` : ''}`, { alarmDaysBefore: 0, stamp }));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//renqing-village//ZH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:人情村', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

export function icsEventCount(ics: string): number {
  return (ics.match(/BEGIN:VEVENT/g) ?? []).length;
}
