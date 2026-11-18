-- Only crawl "Cộng đồng cầu lông Đà Nẵng"; groups found later by `discover` start disabled.
alter table public.groups alter column enabled set default false;
insert into public.groups (id, name, url, enabled)
values ('809551886722490', 'Cộng đồng cầu lông Đà Nẵng', 'https://www.facebook.com/groups/809551886722490', true)
on conflict (id) do update set enabled = true;
update public.groups set enabled = false where id <> '809551886722490';
