import { describe, expect, it } from "vitest";
import { createRawSchedulingToken, hashSchedulingToken } from "@/lib/db/scheduling-links";

describe("scheduling link credentials", () => {
  it("creates high-entropy random tokens and stores only a one-way hash", () => {
    const first = createRawSchedulingToken();
    const second = createRawSchedulingToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashSchedulingToken(first)).not.toBe(first);
    expect(hashSchedulingToken(first)).toHaveLength(64);
    expect(hashSchedulingToken(first)).toBe(hashSchedulingToken(first));
  });
});
