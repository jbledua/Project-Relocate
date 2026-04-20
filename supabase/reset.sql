-- Project-Relocate reset script
-- Run this before setup.sql when you want a clean slate.

begin;

-- Drop child tables first, then parent table.
drop table if exists public.box_tags cascade;
drop table if exists public.box_items cascade;
drop table if exists public.boxes cascade;

-- Optional: if you want to remove the extension too, uncomment below.
-- drop extension if exists pgcrypto;

commit;
