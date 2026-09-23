import { DateTime } from "luxon";

export function isTimezone(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && DateTime.now().setZone(value).isValid;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validWindow(startTime: unknown, endTime: unknown) {
  if (!isTime(startTime) || !isTime(endTime)) return false;
  return startTime < endTime;
}

export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value, { zone: "UTC" }).isValid;
}
