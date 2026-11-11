-- Demo offers so the market dashboard isn't empty at launch.
-- They are marked is_demo, shown with a "demo" badge, and can't be contacted.
-- Remove them all later with:  delete from listings where is_demo;

alter table listings add column if not exists is_demo boolean not null default false;

-- Nobody can request contact on a demo listing.
drop policy if exists "request others' public listings" on contact_requests;
create policy "request others' public listings" on contact_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and not owns_listing(listing_id)
    and exists (select 1 from listings l where l.id = listing_id and listing_is_public(l) and not l.is_demo)
  );

-- A placeholder account that owns the demo listings (it can't log in: no password).
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-00000000de00', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'demo@car-exit.invalid', '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into profiles (id, display_name, whatsapp)
values ('00000000-0000-0000-0000-00000000de00', 'حساب تجريبي', '+10000000000')
on conflict (id) do nothing;

-- The 5-listings-per-account limit doesn't apply to the demo account.
alter table listings disable trigger listings_before_write;

insert into listings (owner_id, is_demo, kind, country, city, approval_expires_on, deposit_usd, car_kind, amount_usd, title, details)
select '00000000-0000-0000-0000-00000000de00', true, d.kind::listing_kind, d.country, d.city,
  d.expires::date, d.deposit, d.car::car_kind, d.amount, d.title, 'عرض تجريبي للتوضيح فقط، ليس للتواصل.'
from (values
  ('holder', 'SA', 'الرياض',  '2028-03-15', 850, 'fuel',     4500, 'موافقة سارية حتى مارس 2028'),
  ('holder', 'SA', 'جدة',     '2028-01-10', 720, 'any',      3800, 'موافقة سيارة بنزين، جدة'),
  ('holder', 'SA', 'الدمام',  '2027-11-20', 640, 'fuel',     3000, 'موافقة تنتهي آخر 2027'),
  ('holder', 'SA', 'الرياض',  '2028-05-01', 910, 'electric', 5200, 'موافقة سيارة كهرباء'),
  ('holder', 'AE', 'دبي',     '2028-02-28', 780, 'any',      4200, 'موافقة سارية، دبي'),
  ('holder', 'AE', 'أبوظبي',  '2027-12-05', 560, 'fuel',     2600, 'موافقة للبيع السريع'),
  ('holder', 'AE', 'الشارقة', '2028-04-12', 890, 'any',      4800, 'موافقة حتى أبريل 2028'),
  ('holder', 'KW', 'الكويت',  '2028-01-25', 700, 'fuel',     3500, 'موافقة سارية، الكويت'),
  ('holder', 'KW', 'الكويت',  '2027-10-30', 450, 'any',      2000, 'موافقة تنتهي أكتوبر 2027'),
  ('holder', 'QA', 'الدوحة',  '2028-06-01', 950, 'electric', 6000, 'موافقة كهرباء حتى يونيو 2028'),
  ('holder', 'OM', 'مسقط',    '2028-02-10', 600, 'any',      2800, 'موافقة سارية، مسقط'),
  ('holder', 'US', 'نيوجيرسي','2028-03-30', 820, 'any',      5500, 'موافقة من أمريكا'),
  ('holder', 'GB', 'لندن',    '2027-12-20', 680, 'fuel',     3200, 'موافقة من بريطانيا'),
  ('holder', 'IT', 'ميلانو',  '2028-01-05', 540, 'any',      2400, 'موافقة من إيطاليا'),
  ('funder', 'SA', 'الرياض',  null, null, 'any',      4000, 'أبحث عن موافقة في السعودية'),
  ('funder', 'SA', 'جدة',     null, null, 'fuel',     3000, 'مشتري جاد لموافقة بنزين'),
  ('funder', 'AE', 'دبي',     null, null, 'any',      5000, 'أبحث عن موافقة سارية لـ 2028'),
  ('funder', 'KW', 'الكويت',  null, null, 'any',      2500, 'أبحث عن موافقة بسعر مناسب'),
  ('funder', 'QA', 'الدوحة',  null, null, 'electric', 6000, 'أبحث عن موافقة سيارة كهرباء'),
  ('funder', 'DE', 'برلين',   null, null, 'any',      3500, 'أبحث عن موافقة من أوروبا')
) as d(kind, country, city, expires, deposit, car, amount, title)
where not exists (select 1 from listings where is_demo);

alter table listings enable trigger listings_before_write;
