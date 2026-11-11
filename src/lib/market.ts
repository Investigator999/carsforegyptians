import type { Listing } from "./listings";

type Row = Pick<Listing, "kind" | "country" | "amount_usd" | "cash_usd" | "is_demo">;

export type CountryRow = {
  country: string;
  holders: number;
  funders: number;
  total: number;
  avgAsk: number | null;
  avgCash: number | null;
};
export type Bucket = { label: string; from: number; to: number | null; holders: number; funders: number };

export const BUCKET_EDGES = [0, 8000, 9000, 10000, 11000, 12000] as const;

function avg(ns: number[]) {
  return ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : null;
}

export function median(ns: number[]) {
  if (!ns.length) return null;
  const s = [...ns].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function summarize(rows: Row[]) {
  const holders = rows.filter((r) => r.kind === "holder");
  const funders = rows.filter((r) => r.kind === "funder");
  const asks = holders.map((r) => r.amount_usd).filter((n): n is number => n != null);
  const offers = funders.map((r) => r.amount_usd).filter((n): n is number => n != null);

  const byCountry = new Map<string, CountryRow>();
  for (const r of rows) {
    const c = byCountry.get(r.country) ?? { country: r.country, holders: 0, funders: 0, total: 0, avgAsk: null, avgCash: null };
    if (r.kind === "holder") c.holders++;
    else c.funders++;
    c.total++;
    byCountry.set(r.country, c);
  }
  const cashOf = (rs: Row[]) => rs.map((r) => r.cash_usd).filter((n): n is number => n != null);
  for (const c of byCountry.values()) {
    c.avgCash = avg(cashOf(holders.filter((r) => r.country === c.country)));
    c.avgAsk = avg(
      holders.filter((r) => r.country === c.country && r.amount_usd != null).map((r) => r.amount_usd as number),
    );
  }

  const k = (n: number) => `${n / 1000}K`;
  const buckets: Bucket[] = BUCKET_EDGES.map((from, i) => {
    const to = BUCKET_EDGES[i + 1] ?? null;
    const inside = (n: number) => n >= from && (to == null || n < to);
    return {
      label: to == null ? `${k(from)}+` : from === 0 ? `أقل من ${k(to)}` : `${k(from)}–${k(to)}`,
      from,
      to,
      holders: asks.filter(inside).length,
      funders: offers.filter(inside).length,
    };
  });

  return {
    total: rows.length,
    holders: holders.length,
    funders: funders.length,
    demo: rows.filter((r) => r.is_demo).length,
    medianAsk: median(asks),
    avgAsk: avg(asks),
    avgCashAsk: avg(cashOf(holders)),
    avgCashOffer: avg(cashOf(funders)),
    medianOffer: median(offers),
    minAsk: asks.length ? Math.min(...asks) : null,
    maxAsk: asks.length ? Math.max(...asks) : null,
    countries: [...byCountry.values()].sort((a, b) => b.total - a.total || a.country.localeCompare(b.country)),
    buckets,
  };
}

/** Compact USD for tiles and axes: 950 → $950, 4500 → $4.5K */
export function compactUsd(n: number | null) {
  if (n == null) return "—";
  return n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K` : `$${n}`;
}
