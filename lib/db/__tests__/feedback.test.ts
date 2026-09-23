import { describe, it, expect, vi } from "vitest";
import { saveFeedbackDraft, submitFeedback } from "../feedback";

const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
const updateMock = vi.fn().mockReturnThis();
const eqMock = vi.fn().mockReturnThis();

vi.mock("@/lib/db/admin", () => {
  return {
    createDatabaseAdmin: () => ({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
        single: vi.fn().mockResolvedValue({ 
          data: { interviewer_id: "u1", status: "DRAFT" }, 
          error: null 
        }),
        update: updateMock,
        upsert: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      rpc: rpcMock
    })
  };
});

describe("Feedback", () => {
  it("should save draft feedback successfully", async () => {
    eqMock.mockReturnThis();
    const result = await saveFeedbackDraft("fb1", "u1", { overallRating: 4, recommendation: "YES" });
    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalled();
  });

  it("should call rpc to submit feedback", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const result = await submitFeedback("fb1", "u1", { overallRating: 5, recommendation: "STRONG_YES" });
    expect(result.success).toBe(true);
  });

  it("should fail submission if forbidden", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "FORBIDDEN" } });
    await expect(submitFeedback("fb1", "u1", {})).rejects.toThrow("Forbidden");
  });

  it("should fail submission if already submitted", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "ALREADY_SUBMITTED" } });
    await expect(submitFeedback("fb1", "u1", {})).rejects.toThrow("Already submitted");
  });
});
