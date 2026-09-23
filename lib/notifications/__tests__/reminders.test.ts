import { describe, it, expect, vi } from "vitest";
import { createBookingNotifications } from "../service";

const upsertMock = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      from: vi.fn().mockImplementation((table) => {
        if (table === "interview_panel_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ user_id: "u1", profiles: { email: "u1@test.com" } }], error: null })
          };
        }
        if (table === "notifications") {
          return {
            upsert: upsertMock,
          };
        }
        if (table === "interviews") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: "test-int", candidate_email: "cand@test.com", starts_at: (globalThis as unknown as Record<string, string>).__INTERVIEW_TIME || new Date(Date.now() + 86400000 * 7).toISOString(), timezone: "UTC" }, 
              error: null 
            }),
          }
        }
        if (table === "notification_preferences") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null })
          }
        }
        return {};
      }),
    })
  };
});

describe("Reminder Skipping Logic", () => {
  it("7 days before: all reminders created", async () => {
    (globalThis as unknown as Record<string, string>).__INTERVIEW_TIME = new Date(Date.now() + 86400000 * 7).toISOString();
    upsertMock.mockClear();
    await createBookingNotifications({ interviewId: "test-int" });
    const calls = upsertMock.mock.calls[0][0];
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_24_HOURS").length).toBe(2);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_1_HOUR").length).toBe(2);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_10_MINUTES").length).toBe(2);
  });

  it("23 hours before: 24h skipped", async () => {
    (globalThis as unknown as Record<string, string>).__INTERVIEW_TIME = new Date(Date.now() + 3600000 * 23).toISOString();
    upsertMock.mockClear();
    await createBookingNotifications({ interviewId: "test-int" });
    const calls = upsertMock.mock.calls[0][0];
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_24_HOURS").length).toBe(0);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_1_HOUR").length).toBe(2);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_10_MINUTES").length).toBe(2);
  });

  it("50 mins before: 24h & 1h skipped", async () => {
    (globalThis as unknown as Record<string, string>).__INTERVIEW_TIME = new Date(Date.now() + 60000 * 50).toISOString();
    upsertMock.mockClear();
    await createBookingNotifications({ interviewId: "test-int" });
    const calls = upsertMock.mock.calls[0][0];
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_24_HOURS").length).toBe(0);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_1_HOUR").length).toBe(0);
    expect(calls.filter((c: { type: string }) => c.type === "REMINDER_10_MINUTES").length).toBe(2);
  });

  it("5 mins before: all skipped", async () => {
    (globalThis as unknown as Record<string, string>).__INTERVIEW_TIME = new Date(Date.now() + 60000 * 5).toISOString();
    upsertMock.mockClear();
    await createBookingNotifications({ interviewId: "test-int" });
    const calls = upsertMock.mock.calls[0][0];
    expect(calls.filter((c: { type: string }) => c.type.startsWith("REMINDER_")).length).toBe(0);
  });
});
