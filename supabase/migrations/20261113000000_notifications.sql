-- Email the site owner when something happens: a new account, a completed
-- profile, a new listing, a new contact request. Emails go through Resend.
--
-- Setup (once, in the SQL Editor, after running this file):
--   insert into private.notify_settings (resend_api_key, notify_email)
--   values ('re_YOUR_KEY', 'you@example.com')
--   on conflict (id) do update set resend_api_key = excluded.resend_api_key, notify_email = excluded.notify_email;
-- Until that row exists, nothing is sent. Delete the row to stop the emails.

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.notify_settings (
  id integer primary key default 1 check (id = 1),
  resend_api_key text not null,
  notify_email text not null
);
revoke all on private.notify_settings from public, anon, authenticated;

-- Sends in the background (pg_net), so a slow or failing email never blocks the user.
create or replace function private.notify(subject text, body text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  s private.notify_settings;
  totals text;
begin
  select * into s from private.notify_settings where id = 1;
  if s.resend_api_key is null then
    return;
  end if;

  select format(E'\n\n— الإجمالي حتى الآن —\nحسابات: %s\nأكملوا البيانات: %s\nإعلانات حقيقية: %s\nطلبات تواصل: %s',
      (select count(*) from auth.users where id <> '00000000-0000-0000-0000-00000000de00'),
      (select count(*) from profiles where id <> '00000000-0000-0000-0000-00000000de00'),
      (select count(*) from listings where not is_demo),
      (select count(*) from contact_requests))
    into totals;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Car Exit <onboarding@resend.dev>',
      'to', jsonb_build_array(s.notify_email),
      'subject', subject,
      'text', body || totals
    )
  );
exception when others then
  raise warning 'Car Exit notification failed: %', sqlerrm;
end $$;

revoke all on function private.notify(text, text) from public, anon, authenticated;

-- New account (email + password)
create or replace function private.on_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.notify('Car Exit: حساب جديد', format('حساب جديد اتعمل على الموقع: %s', new.email));
  return new;
end $$;

drop trigger if exists car_exit_notify_new_user on auth.users;
create trigger car_exit_notify_new_user after insert on auth.users
  for each row execute function private.on_new_user();

-- Profile completed (name + WhatsApp). The number itself is left out on purpose.
create or replace function private.on_new_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id = '00000000-0000-0000-0000-00000000de00' then
    return new;
  end if;
  perform private.notify('Car Exit: مستخدم أكمل بياناته', format('%s أكمل بياناته (الاسم والواتساب).', new.display_name));
  return new;
end $$;

drop trigger if exists car_exit_notify_new_profile on profiles;
create trigger car_exit_notify_new_profile after insert on profiles
  for each row execute function private.on_new_profile();

-- New real listing
create or replace function private.on_new_listing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_demo then
    return new;
  end if;
  perform private.notify(
    'Car Exit: إعلان جديد',
    format(E'%s\nالنوع: %s\nالدولة: %s\nالوديعة: %s دولار\nكاش: %s دولار\n\nhttps://carexit.app/listings/%s',
      new.title,
      case new.kind when 'holder' then 'صاحب موافقة' else 'مشتري' end,
      new.country,
      coalesce(new.amount_usd::text, '—'),
      coalesce(new.cash_usd::text, '—'),
      new.id)
  );
  return new;
end $$;

drop trigger if exists car_exit_notify_new_listing on listings;
create trigger car_exit_notify_new_listing after insert on listings
  for each row execute function private.on_new_listing();

-- New contact request
create or replace function private.on_new_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.notify(
    'Car Exit: طلب تواصل جديد',
    format(E'طلب تواصل جديد على إعلان: %s\n\nhttps://carexit.app/listings/%s',
      (select title from listings where id = new.listing_id), new.listing_id)
  );
  return new;
end $$;

drop trigger if exists car_exit_notify_new_request on contact_requests;
create trigger car_exit_notify_new_request after insert on contact_requests
  for each row execute function private.on_new_request();
