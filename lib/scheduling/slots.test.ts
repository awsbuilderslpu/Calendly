import { describe, expect, it } from "vitest";
import { getAvailableSlots, type PanelMemberAvailability } from "@/lib/scheduling/slots";

const alice = (rules: PanelMemberAvailability["rules"], exceptions: PanelMemberAvailability["exceptions"] = []): PanelMemberAvailability => ({ id: "alice", name: "Alice", rules, exceptions });
const mondayRule = (startTime: string, endTime: string, timezone = "Asia/Kolkata") => ({ dayOfWeek: 1, startTime, endTime, timezone });

const options = (members: PanelMemberAvailability[], overrides: Partial<Parameters<typeof getAvailableSlots>[0]> = {}) => ({
  members,
  requiredInterviewers: 1,
  startDate: "2026-09-21",
  endDate: "2026-09-21",
  durationMinutes: 60,
  timezone: "Asia/Kolkata",
  intervalMinutes: 30,
  ...overrides,
});

describe("getAvailableSlots", () => {
  it("generates contained slots at the configured interval", () => {
    const slots = getAvailableSlots(options([alice([mondayRule("09:00", "17:00")])]));
    expect(slots).toHaveLength(15);
    expect(slots[0].start).toContain("09:00");
    expect(slots.at(-1)?.start).toContain("16:00");
  });

  it("does not cross a break between availability windows", () => {
    const slots = getAvailableSlots(options([alice([mondayRule("09:00", "12:00"), mondayRule("13:00", "17:00")])]));
    expect(slots.some((slot) => slot.start.includes("11:30"))).toBe(false);
    expect(slots.some((slot) => slot.start.includes("13:00"))).toBe(true);
  });

  it("requires the configured number of panel members and returns combinations", () => {
    const bob: PanelMemberAvailability = { id: "bob", name: "Bob", rules: [mondayRule("10:00", "18:00")], exceptions: [] };
    const charlie: PanelMemberAvailability = { id: "charlie", name: "Charlie", rules: [mondayRule("11:00", "15:00")], exceptions: [] };
    const slots = getAvailableSlots(options([alice([mondayRule("09:00", "17:00")]), bob, charlie], { requiredInterviewers: 2 }));
    expect(slots.some((slot) => slot.start.includes("10:00") && slot.interviewers.map((person) => person.id).join() === "alice,bob")).toBe(true);
    expect(slots.some((slot) => slot.start.includes("11:00") && slot.interviewers.map((person) => person.id).join() === "alice,charlie")).toBe(true);
    expect(slots.every((slot) => slot.interviewers.length === 2)).toBe(true);
  });

  it("subtracts unavailable exceptions and uses available overrides", () => {
    const slots = getAvailableSlots(options([alice([mondayRule("09:00", "17:00")], [{ date: "2026-09-21", startTime: "12:00", endTime: "14:00", isAvailable: false }])]));
    expect(slots.some((slot) => slot.start.includes("11:30"))).toBe(false);
    expect(slots.some((slot) => slot.start.includes("14:00"))).toBe(true);
  });

  it.each(["Asia/Kolkata", "America/New_York", "Europe/London", "UTC"])('supports %s', (timezone) => {
    const slots = getAvailableSlots(options([alice([{ dayOfWeek: 5, startTime: "09:00", endTime: "10:00", timezone }])], { startDate: "2026-09-25", endDate: "2026-09-25", timezone }));
    expect(slots).toHaveLength(1);
    expect(slots[0].timezone).toBe(timezone);
  });

  it("handles a DST transition without assuming a fixed UTC offset", () => {
    const slots = getAvailableSlots(options([alice([{ dayOfWeek: 0, startTime: "01:00", endTime: "05:00", timezone: "America/New_York" }])], {
      startDate: "2026-03-08",
      endDate: "2026-03-08",
      timezone: "America/New_York",
      intervalMinutes: 60,
      durationMinutes: 60,
    }));
    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots.map((slot) => slot.start.slice(-6))).size).toBeGreaterThan(1);
  });
});
