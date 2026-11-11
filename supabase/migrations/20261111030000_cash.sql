-- كاش: the cash (USD) the buyer pays the approval holder on top of the deposit.
-- Holder listings: cash asked. Buyer listings: cash offered.
alter table listings add column if not exists cash_usd integer check (cash_usd between 0 and 10000000);

grant insert (cash_usd) on listings to authenticated;
grant update (cash_usd) on listings to authenticated;

-- Cash amounts for the demo offers ($1,000 - $4,000).
update listings l set cash_usd = d.cash
from (values
  ('موافقة سارية حتى مارس 2028', 3000),
  ('موافقة سيارة بنزين، جدة', 2500),
  ('موافقة تنتهي آخر 2027', 1500),
  ('موافقة سيارة كهرباء', 3500),
  ('موافقة سارية، دبي', 2800),
  ('موافقة للبيع السريع', 1000),
  ('موافقة حتى أبريل 2028', 3200),
  ('موافقة سارية، الكويت', 2200),
  ('موافقة تنتهي أكتوبر 2027', 1200),
  ('موافقة كهرباء حتى يونيو 2028', 4000),
  ('موافقة سارية، مسقط', 2000),
  ('موافقة من أمريكا', 3800),
  ('موافقة من بريطانيا', 2400),
  ('موافقة من إيطاليا', 1800),
  ('أبحث عن موافقة في السعودية', 2500),
  ('مشتري جاد لموافقة بنزين', 2000),
  ('أبحث عن موافقة سارية لـ 2028', 3000),
  ('أبحث عن موافقة بسعر مناسب', 1500),
  ('أبحث عن موافقة سيارة كهرباء', 3500),
  ('أبحث عن موافقة من أوروبا', 2200)
) as d(title, cash)
where l.is_demo and l.title = d.title;
