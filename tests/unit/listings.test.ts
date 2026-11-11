import { describe, expect, it } from "vitest";
import { expiryLabel, monthsLeft, normalizePhone, parseListingForm, whatsappLink } from "@/lib/listings";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("parseListingForm", () => {
  const holder = {
    kind: "holder",
    country: "SA",
    city: " الرياض ",
    approval_expires_on: "2028-03-01",
    deposit_usd: "850",
    car_kind: "fuel",
    amount_usd: "25,000",
    profit_share_pct: "50",
    title: "موافقة سارية حتى 2028",
    details: "",
  };

  it("accepts a holder listing and cleans the numbers", () => {
    const r = parseListingForm(form(holder));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ city: "الرياض", deposit_usd: 850, amount_usd: 25000, details: null });
  });

  it("requires an expiry date for holders", () => {
    const r = parseListingForm(form({ ...holder, approval_expires_on: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.approval_expires_on).toBeDefined();
  });

  it("drops approval fields from funder listings", () => {
    const r = parseListingForm(form({ ...holder, kind: "funder" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.approval_expires_on).toBeNull();
    expect(r.data.deposit_usd).toBeNull();
  });

  it("rejects unknown countries and bad percentages", () => {
    const r = parseListingForm(form({ ...holder, country: "XX", profit_share_pct: "120" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["country", "profit_share_pct"]);
  });
});

describe("normalizePhone", () => {
  it.each([
    ["+966 50 123 4567", "+966501234567"],
    ["00971-50-1234567", "+971501234567"],
    ["٠٠٢٠١٠٠١٢٣٤٥٦٧", "+201001234567"],
  ])("%s → %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it("rejects numbers without a country code", () => {
    expect(normalizePhone("0501234567")).toBeNull();
    expect(normalizePhone("+12")).toBeNull();
  });
});

describe("dates and links", () => {
  const today = new Date("2026-11-11T00:00:00Z");
  it("counts whole months left", () => {
    expect(monthsLeft("2028-03-01", today)).toBe(15);
    expect(monthsLeft("2026-11-30", today)).toBe(0);
    expect(monthsLeft("2025-01-01", today)).toBe(0);
  });
  it("labels expiry in years and months", () => {
    expect(expiryLabel("2028-03-01", today)).toBe("تنتهي 03/2028 (باقي 1 سنة و3 شهر)");
  });
  it("builds a wa.me link", () => {
    expect(whatsappLink("+201001234567", "اهلا")).toBe("https://wa.me/201001234567?text=%D8%A7%D9%87%D9%84%D8%A7");
  });
});
