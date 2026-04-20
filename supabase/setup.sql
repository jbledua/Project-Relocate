-- Project-Relocate MVP schema setup
-- Run this in Supabase SQL Editor.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Boxes table
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  box_number text not null unique,
  room text,
  label text,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- Box items table
create table if not exists public.box_items (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for your current searches
create index if not exists idx_boxes_box_number on public.boxes (box_number);
create index if not exists idx_box_items_box_id on public.box_items (box_id);
create index if not exists idx_box_items_content on public.box_items (content);

-- Optional: turn on RLS and allow simple read/write for MVP.
-- For production, replace these with authenticated user-based policies.
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'boxes' and policyname = 'boxes_select_all'
  ) then
    create policy boxes_select_all on public.boxes for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'boxes' and policyname = 'boxes_insert_all'
  ) then
    create policy boxes_insert_all on public.boxes for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_items' and policyname = 'box_items_select_all'
  ) then
    create policy box_items_select_all on public.box_items for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_items' and policyname = 'box_items_insert_all'
  ) then
    create policy box_items_insert_all on public.box_items for insert with check (true);
  end if;
end $$;
