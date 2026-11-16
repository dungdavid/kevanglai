-- Kèo Vãng Lai Đà Nẵng — initial schema
create extension if not exists pgcrypto;

create table if not exists public.groups (
  id text primary key,                    -- Facebook group id or slug
  name text not null default '',
  url text not null,
  member_count integer,
  privacy text not null default 'unknown', -- public | private | unknown
  enabled boolean not null default true,  -- scraper only crawls enabled groups
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  fb_post_id text not null unique,
  post_url text not null,
  group_id text not null references public.groups(id) on delete cascade,
  group_name text,
  author_name text,
  author_url text,
  raw_text text not null,
  text_hash text not null,
  reactions integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  engagement_score integer not null default 0,
  posted_at timestamptz,
  type text not null check (type in ('pass_san', 'tuyen_vang_lai', 'other')),
  venue_name text,
  address text,
  maps_url text,
  price_text text,
  price_vnd integer,
  play_date text,
  play_time text,
  slots_total integer,
  slots_male integer,
  slots_female integer,
  level text,
  phone text,
  extractor text not null default 'heuristic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_type_created_idx on public.posts (type, created_at desc);
create index if not exists posts_group_idx on public.posts (group_id);

-- Public read-only access for the website (anon key); writes only via service role.
alter table public.groups enable row level security;
alter table public.posts enable row level security;

drop policy if exists "public read groups" on public.groups;
create policy "public read groups" on public.groups for select using (true);

drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts for select using (type <> 'other');
