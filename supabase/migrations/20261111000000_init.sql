-- Sayarat Shoraka: a board where approval holders and funders find each other.
-- Phone numbers are never readable from the tables directly. They are only
-- handed out by get_contact() once a listing owner accepts a contact request.

create type listing_kind as enum ('holder', 'funder');
create type listing_status as enum ('active', 'closed');
create type car_kind as enum ('fuel', 'electric', 'any');
create type request_status as enum ('pending', 'accepted', 'declined');

-- ───────────────────────── profiles ─────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  whatsapp text not null check (whatsapp ~ '^\+[0-9]{8,15}$'),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "own profile insert" on profiles for insert to authenticated
  with check (id = auth.uid());
create policy "own profile update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Rows are visible to everyone, but only the name column can be selected.
create policy "profiles readable" on profiles for select using (true);

revoke all on profiles from anon, authenticated;
grant select (id, display_name) on profiles to anon, authenticated;
grant insert (id, display_name, whatsapp) on profiles to authenticated;
grant update (display_name, whatsapp) on profiles to authenticated;

create function get_my_profile()
returns table (display_name text, whatsapp text)
language sql stable security definer set search_path = public as $$
  select p.display_name, p.whatsapp from profiles p where p.id = auth.uid();
$$;

-- ───────────────────────── listings ─────────────────────────
create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  kind listing_kind not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 60),
  -- holder: when the approval runs out, and how much was deposited
  approval_expires_on date,
  deposit_usd integer check (deposit_usd between 0 and 1000000),
  car_kind car_kind not null default 'any',
  -- holder: funding needed. funder: amount available to invest.
  amount_usd integer check (amount_usd between 0 and 10000000),
  -- share of the profit the funder gets
  profit_share_pct integer check (profit_share_pct between 0 and 100),
  title text not null check (char_length(title) between 5 and 100),
  details text check (char_length(details) <= 2000),
  status listing_status not null default 'active',
  hidden boolean not null default false,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holder_needs_expiry check (kind <> 'holder' or approval_expires_on is not null)
);

create index listings_browse_idx on listings (country, kind, created_at desc) where status = 'active' and not hidden;
create index listings_owner_idx on listings (owner_id);

alter table listings enable row level security;

create function listing_is_public(l listings) returns boolean
language sql stable as $$
  select l.status = 'active' and not l.hidden
    and (l.approval_expires_on is null or l.approval_expires_on >= current_date);
$$;

create policy "public or own listings" on listings for select
  using (listing_is_public(listings) or owner_id = auth.uid());
create policy "own listing insert" on listings for insert to authenticated
  with check (owner_id = auth.uid());
create policy "own listing update" on listings for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own listing delete" on listings for delete to authenticated
  using (owner_id = auth.uid());

-- Owners cannot touch hidden or report_count.
revoke all on listings from anon, authenticated;
grant select on listings to anon, authenticated;
grant delete on listings to authenticated;
grant insert (kind, country, city, approval_expires_on, deposit_usd, car_kind, amount_usd,
  profit_share_pct, title, details) on listings to authenticated;
grant update (country, city, approval_expires_on, deposit_usd, car_kind, amount_usd,
  profit_share_pct, title, details, status) on listings to authenticated;

create function listings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' and (
    select count(*) from listings where owner_id = new.owner_id and status = 'active'
  ) >= 5 then
    raise exception 'too_many_listings' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger listings_before_write before insert or update on listings
  for each row execute function listings_before_write();

-- ───────────────────────── contact requests ─────────────────────────
create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  requester_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  message text not null check (char_length(message) between 5 and 500),
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (listing_id, requester_id)
);

create index contact_requests_requester_idx on contact_requests (requester_id);

alter table contact_requests enable row level security;

create function owns_listing(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from listings where id = lid and owner_id = auth.uid());
$$;

create policy "parties read requests" on contact_requests for select to authenticated
  using (requester_id = auth.uid() or owns_listing(listing_id));
create policy "request others' public listings" on contact_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and not owns_listing(listing_id)
    and exists (select 1 from listings l where l.id = listing_id and listing_is_public(l))
  );
create policy "owner answers" on contact_requests for update to authenticated
  using (owns_listing(listing_id)) with check (owns_listing(listing_id));

revoke all on contact_requests from anon, authenticated;
grant select on contact_requests to authenticated;
grant insert (listing_id, message) on contact_requests to authenticated;
grant update (status) on contact_requests to authenticated;

create function contact_requests_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and (
    select count(*) from contact_requests
    where requester_id = new.requester_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.answered_at := now();
  end if;
  return new;
end $$;

create trigger contact_requests_before_write before insert or update on contact_requests
  for each row execute function contact_requests_before_write();

-- The other party's name + WhatsApp, only once the request is accepted.
create function get_contact(request_id uuid)
returns table (display_name text, whatsapp text)
language sql stable security definer set search_path = public as $$
  select p.display_name, p.whatsapp
  from contact_requests r
  join listings l on l.id = r.listing_id
  join profiles p on p.id = case when r.requester_id = auth.uid() then l.owner_id else r.requester_id end
  where r.id = request_id
    and r.status = 'accepted'
    and (r.requester_id = auth.uid() or l.owner_id = auth.uid());
$$;

-- ───────────────────────── reports ─────────────────────────
create table reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

alter table reports enable row level security;
create policy "anyone signed in can report" on reports for insert to authenticated
  with check (reporter_id = auth.uid());
revoke all on reports from anon, authenticated;
grant insert (listing_id, reason) on reports to authenticated;

-- Three reports from different people hide a listing until an admin looks at it.
create function reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update listings set report_count = report_count + 1,
    hidden = hidden or report_count + 1 >= 3
  where id = new.listing_id;
  return new;
end $$;

create trigger reports_after_insert after insert on reports
  for each row execute function reports_after_insert();

-- ───────────────────────── market numbers ─────────────────────────
create function market_stats()
returns table (country text, holders bigint, funders bigint, avg_deposit_usd integer, soonest_expiry date)
language sql stable security definer set search_path = public as $$
  select l.country,
    count(*) filter (where l.kind = 'holder'),
    count(*) filter (where l.kind = 'funder'),
    round(avg(l.deposit_usd) filter (where l.kind = 'holder'))::integer,
    min(l.approval_expires_on) filter (where l.kind = 'holder')
  from listings l
  where listing_is_public(l)
  group by l.country
  order by count(*) desc;
$$;

grant execute on function get_my_profile() to authenticated;
grant execute on function get_contact(uuid) to authenticated;
grant execute on function market_stats() to anon, authenticated;
revoke execute on function get_my_profile() from anon, public;
revoke execute on function get_contact(uuid) from anon, public;
