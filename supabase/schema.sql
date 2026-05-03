create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'elev' check (role in ('profesor', 'elev')),
  specialization text not null default 'Nespecificată',
  badges_cpd integer not null default 0,
  activity_years integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  class_level text not null,
  format text not null,
  description text not null,
  file_path text not null,
  public_url text not null,
  download_count integer not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(lower(new.raw_user_meta_data->>'role'), 'elev')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.resources enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "resources_select_authenticated" on public.resources;
create policy "resources_select_authenticated"
on public.resources
for select
to authenticated
using (true);

drop policy if exists "resources_insert_own" on public.resources;
create policy "resources_insert_own"
on public.resources
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "resources_update_own" on public.resources;
create policy "resources_update_own"
on public.resources
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "storage_select_authenticated" on storage.objects;
create policy "storage_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'resources');

drop policy if exists "storage_insert_own_folder" on storage.objects;
create policy "storage_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resources' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "storage_update_own_folder" on storage.objects;
create policy "storage_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resources' and
  auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'resources' and
  auth.uid()::text = (storage.foldername(name))[1]
);
