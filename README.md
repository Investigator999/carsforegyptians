# 🚗 شركاء السيارة

لوحة إعلانات مجانية تجمع **أصحاب موافقات مبادرة سيارات المصريين بالخارج** مع **من يملك التمويل**، عشان يتفقوا مباشرة على شراكة (الممول يدفع ثمن السيارة والجمارك، والربح يتقسم بينهم) بدون سماسرة.

A free listings board that connects Egyptians abroad who hold an approval under the expat car initiative with people who have the cash to fund the car, in exchange for a share of the profit. No brokers, no commission.

## What it does
- **Two kinds of listings:** *holder* (has an approval and needs funding) and *funder* (has money and wants a partner). Each listing shows country, city, approval expiry, deposit paid, amount needed or available, the funder's profit share, and car type (fuel or electric).
- **Browse and filter** by country, listing kind and car type. Sort by newest, soonest expiry or lowest deposit.
- **Market table by country:** number of holders and funders, average deposit, and the soonest expiry.
- **Private contact:** WhatsApp numbers never appear on the site. A visitor sends a contact request with a short message. If the listing owner accepts, both sides see each other's name and WhatsApp (with a one-tap WhatsApp button) under **حسابي**.
- **Safety:**
  - Expired approvals disappear on their own.
  - Three reports from different people hide a listing.
  - Each account can have at most 5 active listings and send 20 contact requests a day.
  - A safety tips page.
- **Login** with a magic link sent by email, so there are no passwords.

## Stack
Next.js 15 (App Router, Server Actions, Tailwind v4) and Supabase (Postgres, Auth, Row Level Security). Arabic, right-to-left and mobile-first.

**Security lives in the database** (`supabase/migrations/`):
- Row Level Security and column grants mean the browser can never read `profiles.whatsapp`.
- Numbers only come out of `get_contact()`, and only for the two people on an accepted request.
- Users can't change `hidden` or `report_count`, and they can't accept their own requests.

## Run locally
Needs Node 20+ and Docker.
```bash
npm install
npm run db:start        # local Supabase; applies the migration and prints the keys
cp .env.example .env.local   # paste the anon key printed above
npm run dev             # http://localhost:3000
```
Login emails land in Mailpit at http://127.0.0.1:54324.

| Command | |
|---|---|
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint, tsc, unit tests |
| `npm run test:e2e` | Two users go through the whole flow in a browser (needs `db:start`) |
| `npm run db:reset` | Wipe the local DB and re-apply the migration |

## Go live (Supabase + Vercel, both have free tiers)
1. **Supabase:** create a project, open **SQL Editor**, paste `supabase/migrations/20261111000000_init.sql` and click **Run**.
2. **Supabase → Authentication → URL Configuration:** set the Site URL to your domain and add `https://YOUR-DOMAIN/**` to the Redirect URLs.
3. **Supabase → Authentication → Emails:** the built-in mailer only sends a few emails per hour. For real traffic, set up custom SMTP (Resend, Brevo, etc.). You can also translate the "Magic Link" email template into Arabic.
4. **Vercel:** import the GitHub repo and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Settings → API). Deploy.

## Moderating
There is no admin page yet. Use the Supabase dashboard: the **Table Editor** shows `reports`, and setting `listings.hidden = false` brings a listing back after review.
