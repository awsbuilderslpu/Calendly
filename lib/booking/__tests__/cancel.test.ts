import { describe, it, expect, vi } from "vitest";
import { cancelInterview } from "../cancel";

const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });

vi.mock("@/lib/db/admin", () => {
  return {
    createDatabaseAdmin: () => ({
      rpc: rpcMock
    })
  };
});

vi.mock("@/lib/integrations/calendar/service", () => ({
  syncInterviewCalendar: vi.fn().mockResolvedValue(true),
  deleteInterviewCalendarEvent: vi.fn().mockResolvedValue(true)
}));

vi.mock("@/lib/notifications/service", () => ({
  createRescheduleNotifications: vi.fn().mockResolvedValue(true),
  createCancellationNotifications: vi.fn().mockResolvedValue(true)
}));

describe("Cancel Interview", () => {
  it("should call cancel_interview rpc successfully", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const result = await cancelInterview("test-int", "CANDIDATE");
    expect(result.success).toBe(true);
  });

  it("should return cutoff error if rpc raises CUTOFF", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "CUTOFF" } });
    const result = await cancelInterview("test-int", "CANDIDATE");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cancellation is not allowed");
  });
});
