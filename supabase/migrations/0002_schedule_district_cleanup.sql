-- Kèo Vãng Lai Đà Nẵng — caulongdn-style features
-- 4 post types, district, normalized play time, contact fields, automatic cleanup of past posts.

-- 1) Post types: + tim_nhom (looking for a group to join), tim_san (looking for a court)
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('pass_san', 'tuyen_vang_lai', 'tim_nhom', 'tim_san', 'other'));

-- 2) New columns
alter table public.posts
  add column if not exists district text,          -- hai_chau | thanh_khe | son_tra | ngu_hanh_son | lien_chieu | cam_le | hoa_vang
  add column if not exists play_start timestamptz, -- normalized start of play (Asia/Ho_Chi_Minh resolved)
  add column if not exists play_end timestamptz,
  add column if not exists zalo text,
  add column if not exists level_rank smallint;    -- 1=Yếu .. 6=Khá+, for level filtering

create index if not exists posts_play_start_idx on public.posts (play_start);
create index if not exists posts_district_idx on public.posts (district);

-- 3) Readers only see actual listings
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts for select using (type <> 'other');

-- 4) Cleanup: delete posts whose play time ended over 12h ago, or undated posts older than 2 days.
create or replace function public.cleanup_old_posts() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.posts
  where coalesce(play_end, play_start + interval '2 hours') < now() - interval '12 hours'
     or (play_start is null and created_at < now() - interval '2 days');
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.cleanup_old_posts() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-old-posts';
-- 18:00 UTC = 01:00 Asia/Ho_Chi_Minh
select cron.schedule('cleanup-old-posts', '0 18 * * *', $$select public.cleanup_old_posts()$$);
