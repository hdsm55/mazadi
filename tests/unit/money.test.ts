import { describe, it, expect } from "vitest";
import { toMinor, fromMinor, nextValidBidAmount, nextIncrement, DEFAULT_INCREMENT_LADDER } from "@/server/domain/money/money";

describe("Money domain", () => {
  it("converts dollars to minor units exactly", () => {
    expect(toMinor(8750.25)).toBe(875025);
    expect(toMinor(0)).toBe(0);
    expect(toMinor(1)).toBe(100);
  });

  it("converts minor units back to dollars", () => {
    expect(fromMinor(875025)).toBe(8750.25);
  });

  it("computes next increment from the ladder", () => {
    // 0–100 => +5
    expect(nextIncrement(0)).toBe(500);
    expect(nextIncrement(5000)).toBe(500);
    // 100–500 => +10
    expect(nextIncrement(10000)).toBe(1000);
    // 500–1000 => +25
    expect(nextIncrement(50000)).toBe(2500);
    // 1000–5000 => +50
    expect(nextIncrement(100000)).toBe(5000);
    // 5000+ => +100
    expect(nextIncrement(500000)).toBe(10000);
  });

  it("computes next valid bid amount", () => {
    expect(nextValidBidAmount(0)).toBe(500);
    expect(nextValidBidAmount(10000)).toBe(11000);
    expect(nextValidBidAmount(500000)).toBe(510000);
  });

  it("ladder is ordered and covers all ranges", () => {
    expect(DEFAULT_INCREMENT_LADDER[0].fromMinor).toBe(0);
    expect(DEFAULT_INCREMENT_LADDER[DEFAULT_INCREMENT_LADDER.length - 1].toMinor).toBeNull();
  });
});
