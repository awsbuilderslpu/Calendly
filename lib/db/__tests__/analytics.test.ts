import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/admin", () => {
  return {
    createDatabaseAdmin: () => ({
      rpc: vi.fn().mockResolvedValue({
        data: {
          scheduled: 42,
          upcoming: 18,
          completed: 21,
          cancelled: 3,
          rescheduled: 7,
          feedback: { pending: 4, submitted: 18 },
          calendar: { synced: 38, failed: 1, pending: 2 }
        },
        error: null
      })
    })
  };
});

import { createDatabaseAdmin } from "@/lib/db/admin";

describe("Analytics RPC", () => {
  it("should return formatted dashboard metrics", async () => {
    const db = createDatabaseAdmin();
    const { data } = await db.rpc("get_recruiter_dashboard_metrics", {
      p_start_date: new Date().toISOString(),
      p_end_date: new Date().toISOString()
    });

    expect(data.scheduled).toBe(42);
    expect(data.feedback.pending).toBe(4);
    expect(data.calendar.failed).toBe(1);
  });
});
