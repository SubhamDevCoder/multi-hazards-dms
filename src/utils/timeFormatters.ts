/**
 * Real-Time Date & Time Formatting Utilities for Industrial Skeuomorphic Console
 * Ensures all hazard inception, peak windows, timelines, and logs are grounded in current real time.
 */

export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatTimeHHMMSS(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatDayLabel(date: Date, baseDate: Date = new Date()): string {
  const isSameDay =
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth() &&
    date.getDate() === baseDate.getDate();

  const tomorrow = new Date(baseDate.getTime() + 24 * 3600000);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  if (isSameDay) return 'TODAY';
  if (isTomorrow) return 'TOMORROW';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

export function formatTimestampWithDay(date: Date, baseDate: Date = new Date()): string {
  return `${formatTimeHHMM(date)} (${formatDayLabel(date, baseDate)})`;
}
