import { expect, test, type Browser, type Page } from "@playwright/test";

// Needs the local stack: `npm run db:start` (Mailpit catches the login emails).
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const run = Date.now();
const holder = { email: `holder-${run}@example.com`, name: "أحمد", phone: "+966501112233" };
const funder = { email: `funder-${run}@example.com`, name: "محمود", phone: "+971502223344" };
const title = `موافقة سارية حتى 2028 رقم ${run}`;

async function loginLink(email: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      const link = String(msg.Text).match(/https?:\/\/\S+verify\S+/)?.[0];
      if (link) return link.replace(/[)\]]+$/, "");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no login email for ${email}`);
}

async function signUp(browser: Browser, who: typeof holder, next: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("البريد الإلكتروني").fill(who.email);
  await page.getByRole("button", { name: "أرسل لي رابط الدخول" }).click();
  await expect(page.getByRole("status")).toContainText("أرسلنا رابط الدخول");
  await page.goto(await loginLink(who.email));
  // first visit: fill in name + WhatsApp, then continue to `next`
  await page.getByLabel("الاسم اللي هيظهر للناس").fill(who.name);
  await page.getByLabel("رقم الواتساب بكود الدولة").fill(who.phone);
  await page.getByRole("button", { name: "حفظ" }).click();
  await page.waitForURL((u) => u.pathname + u.search === next || u.pathname === next.split("?")[0]);
  return page;
}

test("holder posts, funder asks, holder accepts, both see each other's WhatsApp", async ({ browser }) => {
  // 1. holder posts a listing
  const h = await signUp(browser, holder, "/listings/new?kind=holder");
  await h.getByLabel("بلد الإقامة").selectOption("SA");
  await h.getByLabel("المدينة (اختياري)").fill("جدة");
  await h.getByLabel("عنوان الإعلان").fill(title);
  await h.getByLabel("تاريخ انتهاء الموافقة").fill("2028-03-01");
  await h.getByLabel("الوديعة المدفوعة (دولار)").fill("850");
  await h.getByLabel("التمويل المطلوب (دولار)").fill("25000");
  await h.getByLabel("نسبة الممول من الربح %").fill("50");
  await h.getByRole("button", { name: "نشر الإعلان" }).click();
  await h.waitForURL(/\/listings\/[0-9a-f-]{36}$/);
  const listingUrl = new URL(h.url()).pathname;
  await expect(h.getByRole("heading", { name: title })).toBeVisible();

  // 2. a logged-out visitor sees it on the board and in the market table, but no phone number
  const anon = await (await browser.newContext()).newPage();
  await anon.goto("/?country=SA");
  await expect(anon.getByTestId("listing-card").filter({ hasText: title })).toBeVisible();
  await expect(anon.getByRole("table")).toContainText("السعودية");
  await anon.goto(listingUrl);
  expect(await anon.content()).not.toContain(holder.phone);

  // …and can't read phone numbers through the API either
  const api = await fetch(`${SUPABASE}/rest/v1/profiles?select=whatsapp`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  expect(api.ok).toBe(false);

  // 3. funder asks to connect
  const f = await signUp(browser, funder, listingUrl);
  await f.getByLabel("رسالة لصاحب الإعلان").fill("أهلًا، معي التمويل وأحب نتكلم");
  await f.getByRole("button", { name: "اطلب التواصل" }).click();
  await expect(f.getByText("أرسلت طلب تواصل على هذا الإعلان")).toBeVisible();
  await f.goto("/me");
  await expect(f.getByTestId("outgoing-request")).toContainText("في الانتظار");
  await expect(f.getByTestId("contact")).toHaveCount(0);

  // 4. holder accepts
  await h.goto("/me");
  const req = h.getByTestId("incoming-request").filter({ hasText: funder.name });
  await expect(req).toContainText("معي التمويل");
  await req.getByRole("button", { name: "وافق وشارك رقمي" }).click();
  await expect(req.getByTestId("contact")).toContainText(funder.phone);

  // 5. funder now sees the holder's number
  await f.reload();
  await expect(f.getByTestId("outgoing-request").getByTestId("contact")).toContainText(holder.phone);
});
