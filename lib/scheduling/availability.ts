import { DateTime } from "luxon";

export type AvailabilityRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive?: boolean;
};

export type AvailabilityException = {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type UtcInterval = {
  start: DateTime;
  end: DateTime;
};

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error(`Invalid local time: ${value}`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function validateZone(timezone: string) {
  const probe = DateTime.now().setZone(timezone);
  if (!probe.isValid) throw new Error(`Invalid IANA timezone: ${timezone}`);
}

function localInterval(date: string, startTime: string, endTime: string, timezone: string): UtcInterval {
  validateZone(timezone);
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startLocal = DateTime.fromISO(date, { zone: timezone }).set({ ...start, second: 0, millisecond: 0 });
  const endLocal = DateTime.fromISO(date, { zone: timezone }).set({ ...end, second: 0, millisecond: 0 });
  if (!startLocal.isValid || !endLocal.isValid || endLocal <= startLocal) throw new Error("Availability end must be after start");
  return { start: startLocal.toUTC(), end: endLocal.toUTC() };
}

function subtractInterval(source: UtcInterval, blocked: UtcInterval): UtcInterval[] {
  if (blocked.end <= source.start || blocked.start >= source.end) return [source];
  const result: UtcInterval[] = [];
  if (blocked.start > source.start) result.push({ start: source.start, end: blocked.start < source.end ? blocked.start : source.end });
  if (blocked.end < source.end) result.push({ start: blocked.end > source.start ? blocked.end : source.start, end: source.end });
  return result.filter((interval) => interval.end > interval.start);
}

function dayOfWeek(date: DateTime) {
  return date.weekday % 7;
}

export function getEffectiveAvailability(
  date: string,
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
): UtcInterval[] {
  const dateValue = DateTime.fromISO(date, { zone: "UTC" });
  if (!dateValue.isValid) throw new Error(`Invalid date: ${date}`);
  const activeExceptions = exceptions.filter((exception) => exception.date === date);
  const availableExceptions = activeExceptions.filter((exception) => exception.isAvailable);
  const unavailableExceptions = activeExceptions.filter((exception) => !exception.isAvailable);
  const timezone = rules[0]?.timezone;
  if (!timezone && activeExceptions.length === 0) return [];
  const base = availableExceptions.length > 0
    ? availableExceptions.map((exception) => localInterval(date, exception.startTime, exception.endTime, timezone!))
    : rules.filter((rule) => rule.isActive !== false && rule.dayOfWeek === dayOfWeek(DateTime.fromISO(date, { zone: rule.timezone }))).map((rule) => localInterval(date, rule.startTime, rule.endTime, rule.timezone));

  return unavailableExceptions.reduce((intervals, exception) => {
    const exceptionZone = timezone ?? rules[0]?.timezone;
    if (!exceptionZone) return intervals;
    const blocked = localInterval(date, exception.startTime, exception.endTime, exceptionZone);
    return intervals.flatMap((interval) => subtractInterval(interval, blocked));
  }, base);
}

export function intersectIntervals(intervals: UtcInterval[][]): UtcInterval[] {
  if (intervals.length === 0) return [];
  return intervals.reduce((current, next) => current.flatMap((left) => next.flatMap((right) => {
    const start = left.start > right.start ? left.start : right.start;
    const end = left.end < right.end ? left.end : right.end;
    return end > start ? [{ start, end }] : [];
  })));
}
