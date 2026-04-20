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

-- Box tags table
create table if not exists public.box_tags (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  constraint box_tags_unique_box_tag unique (box_id, tag)
);

-- Helpful indexes for your current searches
create index if not exists idx_boxes_box_number on public.boxes (box_number);
create index if not exists idx_box_items_box_id on public.box_items (box_id);
create index if not exists idx_box_items_content on public.box_items (content);
create index if not exists idx_box_tags_box_id on public.box_tags (box_id);
create index if not exists idx_box_tags_tag on public.box_tags (tag);

-- Storage bucket for box photos
insert into storage.buckets (id, name, public)
values ('box-photos', 'box-photos', true)
on conflict (id) do nothing;

-- Optional: turn on RLS and allow simple read/write for MVP.
-- For production, replace these with authenticated user-based policies.
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.box_tags enable row level security;

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
    where schemaname = 'public' and tablename = 'boxes' and policyname = 'boxes_update_all'
  ) then
    create policy boxes_update_all on public.boxes for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'boxes' and policyname = 'boxes_delete_all'
  ) then
    create policy boxes_delete_all on public.boxes for delete using (true);
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_items' and policyname = 'box_items_update_all'
  ) then
    create policy box_items_update_all on public.box_items for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_items' and policyname = 'box_items_delete_all'
  ) then
    create policy box_items_delete_all on public.box_items for delete using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_tags' and policyname = 'box_tags_select_all'
  ) then
    create policy box_tags_select_all on public.box_tags for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_tags' and policyname = 'box_tags_insert_all'
  ) then
    create policy box_tags_insert_all on public.box_tags for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_tags' and policyname = 'box_tags_update_all'
  ) then
    create policy box_tags_update_all on public.box_tags for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'box_tags' and policyname = 'box_tags_delete_all'
  ) then
    create policy box_tags_delete_all on public.box_tags for delete using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'box_photos_select_all'
  ) then
    create policy box_photos_select_all on storage.objects
      for select using (bucket_id = 'box-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'box_photos_insert_all'
  ) then
    create policy box_photos_insert_all on storage.objects
      for insert with check (bucket_id = 'box-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'box_photos_update_all'
  ) then
    create policy box_photos_update_all on storage.objects
      for update using (bucket_id = 'box-photos') with check (bucket_id = 'box-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'box_photos_delete_all'
  ) then
    create policy box_photos_delete_all on storage.objects
      for delete using (bucket_id = 'box-photos');
  end if;
end $$;
