export const ZERRA_TIME_ZONE = "Asia/Baghdad";

function getParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZERRA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
}

function getTimeZoneOffsetMs(value: Date): number {
  const p = getParts(value);
  const representedAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );

  return representedAsUtc - value.getTime();
}

function zonedMidnightToUtc(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid ZERRA date key.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = getTimeZoneOffsetMs(guess);
  return new Date(guess.getTime() - offset);
}

export function getZerraDateKey(value = new Date()): string {
  const p = getParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

export function shiftZerraDateKey(dateKey: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid ZERRA date key.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
}

export function getZerraToday(): string {
  return getZerraDateKey();
}

export function getZerraYesterday(): string {
  return shiftZerraDateKey(getZerraToday(), -1);
}

export function getZerraTomorrow(): string {
  return shiftZerraDateKey(getZerraToday(), 1);
}

export function getZerraDayWindow(dateKey = getZerraToday()) {
  const nextDateKey = shiftZerraDateKey(dateKey, 1);
  return {
    dateKey,
    start: zonedMidnightToUtc(dateKey),
    end: zonedMidnightToUtc(nextDateKey),
  };
}

export function isSameZerraDay(value: Date, reference = new Date()): boolean {
  return getZerraDateKey(value) === getZerraDateKey(reference);
}

export function isSameZerraMonth(value: Date, reference = new Date()): boolean {
  return getZerraDateKey(value).slice(0, 7) === getZerraDateKey(reference).slice(0, 7);
}

export function formatZerraDateTime(value: string | number | Date, locale = "en-GB"): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    timeZone: ZERRA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}