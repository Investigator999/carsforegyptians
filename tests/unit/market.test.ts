import { describe, expect, it } from "vitest";
import { compactUsd, median, summarize } from "@/lib/market";

const row = (
  kind: "holder" | "funder",
  country: string,
  amount_usd: number | null,
  is_demo = false,
  cash_usd: number | null = null,
) => ({ kind, country, amount_usd, cash_usd, is_demo });

describe("summarize", () => {
  const s = summarize([
    row("holder", "SA", 7500, true, 2000),
    row("holder", "SA", 9500, false, 3000),
    row("holder", "AE", 12500),
    row("funder", "SA", 8500, false, 1500),
    row("funder", "KW", null),
  ]);

  it("counts offers by kind and demo", () => {
    expect([s.total, s.holders, s.funders, s.demo]).toEqual([5, 3, 2, 1]);
  });

  it("groups countries, biggest first, with average ask", () => {
    expect(s.countries[0]).toEqual({ country: "SA", holders: 2, funders: 1, total: 3, avgAsk: 8500, avgCash: 2500 });
    expect(s.countries.map((c) => c.country)).toEqual(["SA", "AE", "KW"]);
  });

  it("puts amounts in price buckets", () => {
    expect(s.buckets.map((b) => [b.label, b.holders, b.funders])).toEqual([
      ["أقل من 8K", 1, 0],
      ["8K–9K", 0, 1],
      ["9K–10K", 1, 0],
      ["10K–11K", 0, 0],
      ["11K–12K", 0, 0],
      ["12K+", 1, 0],
    ]);
    expect([s.medianAsk, s.avgAsk, s.minAsk, s.maxAsk]).toEqual([9500, 9833, 7500, 12500]);
    expect([s.avgCashAsk, s.avgCashOffer]).toEqual([2500, 1500]);
  });
});

describe("helpers", () => {
  it("median handles even lists", () => expect(median([1, 4, 2, 3])).toBe(3));
  it("compactUsd", () => {
    expect(compactUsd(950)).toBe("$950");
    expect(compactUsd(4500)).toBe("$4.5K");
    expect(compactUsd(5000)).toBe("$5K");
  });
});
