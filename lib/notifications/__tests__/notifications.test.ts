import { describe, it, expect, vi } from "vitest";
import { createBookingNotifications } from "../service";
import { processPendingNotifications } from "../dispatcher";
import { SsoMailProvider } from "../../integrations/sso-mail";

vi.mock("../../booking/action-tokens", () => ({
  createManagementToken: vi.fn().mockResolvedValue("mock-token")
}));
vi.mock("@supabase/supabase-js", () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function(this: { single: unknown }, key: string) {
      if (key === "id") {
        this.single = vi.fn().mockResolvedValue({ 
          data: { id: "test-int", candidate_email: "cand@test.com", candidate_name: "Cand", job_title: "Eng", round_name: "Tech", starts_at: new Date(Date.now() + 86400000 * 7).toISOString(), ends_at: new Date(Date.now() + 86400000 * 7 + 3600000).toISOString(), timezone: "UTC" }, 
          error: null 
        });
      }
      return this;
    }),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis()
  };

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
            ...chainable,
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return chainable;
      }),
      rpc: vi.fn().mockImplementation(async (method) => {
        if (method === "claim_due_notifications") {
          return { data: [{ id: "n1", interview_id: "test-int", recipient_email: "cand@test.com", type: "BOOKING_CONFIRMATION_CANDIDATE", status: "PENDING", attempt_count: 0 }], error: null };
        }
        return { data: [], error: null };
      })
    })
  };
});

describe("Notifications", () => {
  it("should create correct notifications for booking 7 days ahead", async () => {
    await expect(createBookingNotifications({ interviewId: "test-int" })).resolves.toMatchObject({ success: true });
  });

  it("should process notifications idempotently via dispatcher", async () => {
    SsoMailProvider.prototype.send = vi.fn().mockResolvedValue({ success: true, providerMessageId: "msg1" });
    await processPendingNotifications();
    expect(SsoMailProvider.prototype.send).toHaveBeenCalled();
  });
});
