import { DateTime } from "luxon";
import { getEffectiveAvailability, type AvailabilityException, type AvailabilityRule, type UtcInterval } from "@/lib/scheduling/availability";

export type PanelMemberAvailability = {
  id: string;
  name: string;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
};

export type AvailableSlot = {
  start: string;
  end: string;
  timezone: string;
  interviewers: { id: string; name: string }[];
};

export type SlotOptions = {
  members: PanelMemberAvailability[];
  requiredInterviewers: number;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  timezone: string;
  intervalMinutes?: number;
};

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    for (const rest of combinations(items.slice(index + 1), size - 1)) {
      result.push([items[index], ...rest]);
    }
  }
  return result;
}

function contains(intervals: UtcInterval[], start: DateTime, end: DateTime) {
  return intervals.some((interval) => interval.start <= start && interval.end >= end);
}

export function getAvailableSlots(options: SlotOptions): AvailableSlot[] {
  const { members, requiredInterviewers, startDate, endDate, durationMinutes, timezone, intervalMinutes = 30 } = options;
  if (!members.length || requiredInterviewers < 1 || requiredInterviewers > members.length) return [];
  if (![15, 30, 45, 60, 90, 120].includes(durationMinutes)) throw new Error("Invalid duration");
  if (![15, 30, 45, 60].includes(intervalMinutes)) throw new Error("Invalid slot interval");
  const rangeStart = DateTime.fromISO(startDate, { zone: timezone }).startOf("day");
  const rangeEnd = DateTime.fromISO(endDate, { zone: timezone }).endOf("day");
  if (!rangeStart.isValid || !rangeEnd.isValid || rangeEnd < rangeStart) throw new Error("Invalid date range");
  if (!DateTime.now().setZone(timezone).isValid) throw new Error("Invalid IANA timezone");

  const effectiveByMember = members.map((member) => ({
    member,
    intervals: new Map<string, UtcInterval[]>(),
  }));
  for (const entry of effectiveByMember) {
    let date = rangeStart.startOf("day");
    while (date <= rangeEnd) {
      const dateKey = date.toISODate()!;
      entry.intervals.set(dateKey, getEffectiveAvailability(dateKey, entry.member.rules, entry.member.exceptions));
      date = date.plus({ days: 1 });
    }
  }

  const slots: AvailableSlot[] = [];
  let cursor = rangeStart;
  while (cursor.plus({ minutes: durationMinutes }) <= rangeEnd) {
    const end = cursor.plus({ minutes: durationMinutes });
    const availableMembers = effectiveByMember.filter((entry) => {
      const dateKey = cursor.toISODate()!;
      return contains(entry.intervals.get(dateKey) ?? [], cursor.toUTC(), end.toUTC());
    }).map((entry) => entry.member);
    for (const group of combinations(availableMembers, requiredInterviewers)) {
      slots.push({
        start: cursor.toISO({ suppressMilliseconds: true })!,
        end: end.toISO({ suppressMilliseconds: true })!,
        timezone,
        interviewers: group.map(({ id, name }) => ({ id, name })),
      });
    }
    cursor = cursor.plus({ minutes: intervalMinutes });
  }
  return slots;
}
