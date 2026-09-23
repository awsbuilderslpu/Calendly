import { describe, it, expect, vi } from "vitest";
import { createScorecard } from "../scorecards";

vi.mock("@/lib/db/admin", () => {
  const chainable = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "tpl1" }, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis()
  };
  return {
    createDatabaseAdmin: () => ({
      from: vi.fn().mockReturnValue(chainable)
    })
  };
});

describe("Scorecards", () => {
  it("should create a scorecard template", async () => {
    const result = await createScorecard({ name: "Test", description: "Desc", jobRole: "Eng", sections: [] });
    expect(result).toBeDefined();
    expect(result?.id).toBe("tpl1");
  });
});
