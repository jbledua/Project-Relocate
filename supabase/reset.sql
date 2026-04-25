-- Project-Relocate reset script
-- Run this before setup.sql when you want a clean slate.

begin;

-- Drop child tables first, then parent table.
drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists profiles_set_updated_at on public.profiles;
drop function if exists public.handle_new_user_profile();
drop function if exists public.set_profile_updated_at();

drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;
drop table if exists public.box_tags cascade;
drop table if exists public.box_items cascade;
drop table if exists public.boxes cascade;

-- Optional: if you want to remove the extension too, uncomment below.
-- drop extension if exists pgcrypto;

commit;
