import { describe, expect, it } from "vitest";
import { compactUsd, median, summarize } from "@/lib/market";

const row = (kind: "holder" | "funder", country: string, amount_usd: number | null, is_demo = false) => ({
  kind,
  country,
  amount_usd,
  is_demo,
});

describe("summarize", () => {
  const s = summarize([
    row("holder", "SA", 1500, true),
    row("holder", "SA", 4500),
    row("holder", "AE", 5200),
    row("funder", "SA", 3000),
    row("funder", "KW", null),
  ]);

  it("counts offers by kind and demo", () => {
    expect([s.total, s.holders, s.funders, s.demo]).toEqual([5, 3, 2, 1]);
  });

  it("groups countries, biggest first, with average ask", () => {
    expect(s.countries[0]).toEqual({ country: "SA", holders: 2, funders: 1, total: 3, avgAsk: 3000 });
    expect(s.countries.map((c) => c.country)).toEqual(["SA", "AE", "KW"]);
  });

  it("puts amounts in price buckets", () => {
    expect(s.buckets.map((b) => [b.label, b.holders, b.funders])).toEqual([
      ["أقل من 2K", 1, 0],
      ["2K–3K", 0, 0],
      ["3K–4K", 0, 1],
      ["4K–5K", 1, 0],
      ["5K+", 1, 0],
    ]);
    expect([s.medianAsk, s.minAsk, s.maxAsk]).toEqual([4500, 1500, 5200]);
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
