-- Project-Relocate MVP schema setup
-- Run this in Supabase SQL Editor.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

-- Group members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint group_members_unique_group_user unique (group_id, user_id)
);

-- Boxes table
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  box_number text not null unique,
  room text,
  label text,
  notes text,
  photo_url text,
  owner_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.boxes
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.boxes
  add column if not exists group_id uuid references public.groups(id) on delete set null;

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
create index if not exists idx_boxes_owner_id on public.boxes (owner_id);
create index if not exists idx_boxes_group_id on public.boxes (group_id);
create index if not exists idx_box_items_box_id on public.box_items (box_id);
create index if not exists idx_box_items_content on public.box_items (content);
create index if not exists idx_box_tags_box_id on public.box_tags (box_id);
create index if not exists idx_box_tags_tag on public.box_tags (tag);
create index if not exists idx_groups_owner_id on public.groups (owner_id);
create index if not exists idx_groups_join_code on public.groups (join_code);
create index if not exists idx_group_members_group_id on public.group_members (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);

-- Storage bucket for box photos
insert into storage.buckets (id, name, public)
values ('box-photos', 'box-photos', true)
on conflict (id) do nothing;

-- Optional: turn on RLS and allow simple read/write for MVP.
-- For production, replace these with authenticated user-based policies.
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.box_tags enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups' and policyname = 'groups_select_all'
  ) then
    create policy groups_select_all on public.groups for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups' and policyname = 'groups_insert_all'
  ) then
    create policy groups_insert_all on public.groups for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups' and policyname = 'groups_update_all'
  ) then
    create policy groups_update_all on public.groups for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups' and policyname = 'groups_delete_all'
  ) then
    create policy groups_delete_all on public.groups for delete using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members' and policyname = 'group_members_select_all'
  ) then
    create policy group_members_select_all on public.group_members for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members' and policyname = 'group_members_insert_all'
  ) then
    create policy group_members_insert_all on public.group_members for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members' and policyname = 'group_members_update_all'
  ) then
    create policy group_members_update_all on public.group_members for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members' and policyname = 'group_members_delete_all'
  ) then
    create policy group_members_delete_all on public.group_members for delete using (true);
  end if;
end $$;
