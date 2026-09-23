import { describe, it, expect, vi } from "vitest";
import { rescheduleInterview } from "../reschedule";

vi.mock("@/lib/db/admin", () => {
  return {
    createDatabaseAdmin: () => ({
      from: vi.fn().mockImplementation((table) => {
        if (table === "interviews") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: "test-int", 
                scheduling_request_id: "req-1", 
                ends_at: new Date().toISOString(), 
                starts_at: new Date().toISOString(), 
                schedule_version: 1, 
                timezone: "UTC" 
              }, 
              error: null 
            }),
          };
        }
        if (table === "interview_scheduling_requests") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: "req-1", duration_minutes: 60, panel_id: "panel-1" }, 
              error: null 
            }),
          }
        }
        if (table === "interview_panel_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ user_id: "u1" }], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: { id: "test-int", scheduleVersion: 2 }, error: null })
    })
  };
});

vi.mock("@/lib/db/panels", () => ({
  getPanelSchedulingData: vi.fn().mockResolvedValue({
    panel: { requiredInterviewers: 1 },
    members: [{ id: "u1", email: "u1@test.com", schedules: [], busy: [] }]
  })
}));

vi.mock("@/lib/scheduling/slots", () => ({
  getAvailableSlots: vi.fn().mockReturnValue([
    { start: "2026-09-26T10:00:00.000Z", interviewers: [{ id: "u1" }] }
  ])
}));

vi.mock("@/lib/integrations/calendar/service", () => ({
  syncInterviewCalendar: vi.fn().mockResolvedValue(true),
  deleteInterviewCalendarEvent: vi.fn().mockResolvedValue(true)
}));

vi.mock("@/lib/notifications/service", () => ({
  createRescheduleNotifications: vi.fn().mockResolvedValue(true),
  createCancellationNotifications: vi.fn().mockResolvedValue(true)
}));

describe("Reschedule", () => {
  it("should return success when slot is available", async () => {
    const result = await rescheduleInterview("test-int", "2026-09-26T10:00:00.000Z", "UTC", "key-1", "CANDIDATE");
    expect(result.kind).toBe("success");
  });

  it("should return slot_unavailable if slots don't match", async () => {
    const result = await rescheduleInterview("test-int", "2026-09-26T14:00:00.000Z", "UTC", "key-1", "CANDIDATE");
    expect(result.kind).toBe("slot_unavailable");
  });
});
