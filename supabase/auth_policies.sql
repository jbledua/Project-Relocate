-- Restrict Project-Relocate data access to signed-in users.
-- Run this in Supabase SQL Editor after enabling Supabase Auth providers.

alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.box_tags enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.profiles enable row level security;

-- Remove legacy open-access policies if they exist.
drop policy if exists boxes_select_all on public.boxes;
drop policy if exists boxes_insert_all on public.boxes;
drop policy if exists boxes_update_all on public.boxes;
drop policy if exists boxes_delete_all on public.boxes;

drop policy if exists boxes_select_authenticated on public.boxes;
drop policy if exists boxes_insert_authenticated on public.boxes;
drop policy if exists boxes_update_authenticated on public.boxes;
drop policy if exists boxes_delete_authenticated on public.boxes;

drop policy if exists box_items_select_all on public.box_items;
drop policy if exists box_items_insert_all on public.box_items;
drop policy if exists box_items_update_all on public.box_items;
drop policy if exists box_items_delete_all on public.box_items;

drop policy if exists box_items_select_authenticated on public.box_items;
drop policy if exists box_items_insert_authenticated on public.box_items;
drop policy if exists box_items_update_authenticated on public.box_items;
drop policy if exists box_items_delete_authenticated on public.box_items;

drop policy if exists box_tags_select_all on public.box_tags;
drop policy if exists box_tags_insert_all on public.box_tags;
drop policy if exists box_tags_update_all on public.box_tags;
drop policy if exists box_tags_delete_all on public.box_tags;

drop policy if exists box_tags_select_authenticated on public.box_tags;
drop policy if exists box_tags_insert_authenticated on public.box_tags;
drop policy if exists box_tags_update_authenticated on public.box_tags;
drop policy if exists box_tags_delete_authenticated on public.box_tags;

drop policy if exists groups_select_all on public.groups;
drop policy if exists groups_insert_all on public.groups;
drop policy if exists groups_update_all on public.groups;
drop policy if exists groups_delete_all on public.groups;

drop policy if exists groups_select_authenticated on public.groups;
drop policy if exists groups_insert_authenticated on public.groups;
drop policy if exists groups_update_authenticated on public.groups;
drop policy if exists groups_delete_authenticated on public.groups;

drop policy if exists group_members_select_all on public.group_members;
drop policy if exists group_members_insert_all on public.group_members;
drop policy if exists group_members_update_all on public.group_members;
drop policy if exists group_members_delete_all on public.group_members;

drop policy if exists group_members_select_authenticated on public.group_members;
drop policy if exists group_members_insert_authenticated on public.group_members;
drop policy if exists group_members_update_authenticated on public.group_members;
drop policy if exists group_members_delete_authenticated on public.group_members;

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_all on public.profiles;
drop policy if exists profiles_update_all on public.profiles;
drop policy if exists profiles_delete_all on public.profiles;

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_authenticated on public.profiles;
drop policy if exists profiles_update_authenticated on public.profiles;
drop policy if exists profiles_delete_authenticated on public.profiles;

drop policy if exists box_photos_select_all on storage.objects;
drop policy if exists box_photos_insert_all on storage.objects;
drop policy if exists box_photos_update_all on storage.objects;
drop policy if exists box_photos_delete_all on storage.objects;

drop policy if exists box_photos_select_public on storage.objects;
drop policy if exists box_photos_insert_authenticated on storage.objects;
drop policy if exists box_photos_update_authenticated on storage.objects;
drop policy if exists box_photos_delete_authenticated on storage.objects;

drop policy if exists profile_photos_select_all on storage.objects;
drop policy if exists profile_photos_insert_all on storage.objects;
drop policy if exists profile_photos_update_all on storage.objects;
drop policy if exists profile_photos_delete_all on storage.objects;

drop policy if exists profile_photos_select_public on storage.objects;
drop policy if exists profile_photos_insert_authenticated on storage.objects;
drop policy if exists profile_photos_update_authenticated on storage.objects;
drop policy if exists profile_photos_delete_authenticated on storage.objects;

-- Authenticated users can read and modify app data.
create policy boxes_select_authenticated on public.boxes
  for select to authenticated
  using (true);

create policy boxes_insert_authenticated on public.boxes
  for insert to authenticated
  with check (true);

create policy boxes_update_authenticated on public.boxes
  for update to authenticated
  using (true)
  with check (true);

create policy boxes_delete_authenticated on public.boxes
  for delete to authenticated
  using (true);

create policy box_items_select_authenticated on public.box_items
  for select to authenticated
  using (true);

create policy box_items_insert_authenticated on public.box_items
  for insert to authenticated
  with check (true);

create policy box_items_update_authenticated on public.box_items
  for update to authenticated
  using (true)
  with check (true);

create policy box_items_delete_authenticated on public.box_items
  for delete to authenticated
  using (true);

create policy box_tags_select_authenticated on public.box_tags
  for select to authenticated
  using (true);

create policy box_tags_insert_authenticated on public.box_tags
  for insert to authenticated
  with check (true);

create policy box_tags_update_authenticated on public.box_tags
  for update to authenticated
  using (true)
  with check (true);

create policy box_tags_delete_authenticated on public.box_tags
  for delete to authenticated
  using (true);

create policy groups_select_authenticated on public.groups
  for select to authenticated
  using (true);

create policy groups_insert_authenticated on public.groups
  for insert to authenticated
  with check (auth.uid() = owner_id);

create policy groups_update_authenticated on public.groups
  for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy groups_delete_authenticated on public.groups
  for delete to authenticated
  using (auth.uid() = owner_id);

create policy group_members_select_authenticated on public.group_members
  for select to authenticated
  using (true);

create policy group_members_insert_authenticated on public.group_members
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy group_members_update_authenticated on public.group_members
  for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups
      where groups.id = group_members.group_id
        and groups.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups
      where groups.id = group_members.group_id
        and groups.owner_id = auth.uid()
    )
  );

create policy group_members_delete_authenticated on public.group_members
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups
      where groups.id = group_members.group_id
        and groups.owner_id = auth.uid()
    )
  );

create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

create policy profiles_insert_authenticated on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy profiles_update_authenticated on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_delete_authenticated on public.profiles
  for delete to authenticated
  using (auth.uid() = id);

-- Keep box photos publicly readable but require auth for write operations.
create policy box_photos_select_public on storage.objects
  for select
  using (bucket_id = 'box-photos');

create policy box_photos_insert_authenticated on storage.objects
  for insert to authenticated
  with check (bucket_id = 'box-photos');

create policy box_photos_update_authenticated on storage.objects
  for update to authenticated
  using (bucket_id = 'box-photos')
  with check (bucket_id = 'box-photos');

create policy box_photos_delete_authenticated on storage.objects
  for delete to authenticated
  using (bucket_id = 'box-photos');

create policy profile_photos_select_public on storage.objects
  for select
  using (bucket_id = 'profile-photos');

create policy profile_photos_insert_authenticated on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and owner = auth.uid());

create policy profile_photos_update_authenticated on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos' and owner = auth.uid())
  with check (bucket_id = 'profile-photos' and owner = auth.uid());

create policy profile_photos_delete_authenticated on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and owner = auth.uid());
