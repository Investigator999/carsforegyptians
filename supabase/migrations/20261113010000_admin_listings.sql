-- Admin accounts can post more than 5 listings (to list approvals on behalf of
-- people who send their details on WhatsApp). Users can't set this flag:
-- profiles only grants insert/update on display_name and whatsapp.
--
-- Make your account an admin (replace the email):
--   update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');

alter table profiles add column if not exists is_admin boolean not null default false;

create or replace function listings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT'
    and not coalesce((select is_admin from profiles where id = new.owner_id), false)
    and (select count(*) from listings where owner_id = new.owner_id and status = 'active') >= 5
  then
    raise exception 'too_many_listings' using errcode = 'P0001';
  end if;
  return new;
end $$;
