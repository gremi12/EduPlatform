create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role text not null default 'elev' check (role in ('profesor', 'elev')),
  specialization text not null default 'Nespecificată',
  class_level text,
  badges_cpd integer not null default 0,
  activity_years integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists email text;

create unique index if not exists profiles_email_key
on public.profiles (email);

alter table public.profiles
add column if not exists class_level text;

alter table public.profiles
add column if not exists enrolled_classes text[] not null default '{}';

update public.profiles
set enrolled_classes = case
  when coalesce(class_level, '') <> '' then array[class_level]
  else '{}'::text[]
end
where coalesce(array_length(enrolled_classes, 1), 0) = 0;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'moderator', 'organizator', 'profesor', 'elev'));

update public.profiles as profiles
set email = users.email
from auth.users as users
where profiles.id = users.id
  and coalesce(profiles.email, '') = '';

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  class_level text not null,
  format text not null,
  license_type text not null default 'Creative Commons',
  description text not null,
  file_path text not null,
  public_url text not null,
  download_count integer not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.resources
add column if not exists license_type text not null default 'Creative Commons';

create table if not exists public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  webinar_slug text not null,
  webinar_title text not null,
  full_name text not null,
  email text not null,
  school_name text not null,
  message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, webinar_slug)
);

create table if not exists public.resource_feedback (
  id uuid primary key default gen_random_uuid(),
  resource_slug text not null,
  resource_title text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  helpful_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (resource_slug, user_id)
);

create table if not exists public.resource_feedback_votes (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.resource_feedback(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (feedback_id, user_id)
);

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_slug text not null,
  feedback_id uuid references public.resource_feedback(id) on delete set null,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_groups (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null default 'fa-users',
  focus_area text not null default '',
  subject text not null default '',
  target_class text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.community_groups
add column if not exists subject text not null default '';

alter table public.community_groups
add column if not exists target_class text;

alter table public.community_groups
add column if not exists created_by uuid references public.profiles(id) on delete set null;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references public.community_groups(slug) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_memberships (
  group_slug text not null references public.community_groups(slug) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (group_slug, user_id)
);

insert into public.community_groups (slug, name, description, icon, focus_area, subject, target_class)
values
  ('matematica', 'Grup Matematica', 'Discutii, planuri de lectie si exercitii pentru clase gimnaziale si liceale.', 'fa-square-root-variable', 'Matematica', 'Matematica', null),
  ('informatica', 'Grup Informatica', 'Algoritmi, programare, proiecte digitale si evaluare practica.', 'fa-laptop-code', 'Informatica', 'Informatica', null),
  ('stiinte', 'Grup Stiinte', 'Biologie, fizica si experimente explicate clar pentru profesori.', 'fa-flask', 'Stiinte', 'Stiinte', null),
  ('limba-romana', 'Grup Limba Romana', 'Literatura, gramatica si metode de predare pentru gimnaziu si liceu.', 'fa-book-open-reader', 'Limba romana', 'Limba romana', null)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  focus_area = excluded.focus_area,
  subject = excluded.subject;

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
    email,
    role,
    class_level,
    enrolled_classes
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    case lower(coalesce(new.raw_user_meta_data->>'role', 'elev'))
      when 'admin' then 'admin'
      when 'moderator' then 'moderator'
      when 'organizator' then 'organizator'
      when 'profesor' then 'profesor'
      else 'elev'
    end,
    nullif(new.raw_user_meta_data->>'class_level', ''),
    case
      when jsonb_typeof(new.raw_user_meta_data->'enrolled_classes') = 'array' then (
        select coalesce(array_agg(value), '{}'::text[])
        from jsonb_array_elements_text(new.raw_user_meta_data->'enrolled_classes') as value
      )
      when coalesce(new.raw_user_meta_data->>'class_level', '') <> '' then array[new.raw_user_meta_data->>'class_level']
      else '{}'::text[]
    end
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    class_level = excluded.class_level,
    enrolled_classes = case
      when coalesce(array_length(excluded.enrolled_classes, 1), 0) > 0 then excluded.enrolled_classes
      else public.profiles.enrolled_classes
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.get_community_members(p_group_slug text)
returns table (
  user_id uuid,
  full_name text,
  role text,
  class_level text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    memberships.user_id,
    profiles.full_name,
    profiles.role,
    profiles.class_level,
    memberships.created_at as joined_at
  from public.community_memberships as memberships
  join public.profiles as profiles
    on profiles.id = memberships.user_id
  where auth.uid() is not null
    and memberships.group_slug = p_group_slug
  order by memberships.created_at asc;
$$;

create or replace function public.get_class_students(p_target_class text)
returns table (
  student_id uuid,
  full_name text,
  class_level text,
  enrolled_classes text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id as student_id,
    profiles.full_name,
    profiles.class_level,
    profiles.enrolled_classes
  from public.profiles
  where auth.uid() is not null
    and exists (
      select 1
      from public.profiles as viewer
      where viewer.id = auth.uid()
        and viewer.role in ('admin', 'moderator', 'organizator', 'profesor')
    )
    and profiles.role = 'elev'
    and (
      profiles.class_level = p_target_class
      or p_target_class = any(coalesce(profiles.enrolled_classes, '{}'::text[]))
    )
  order by profiles.full_name asc;
$$;

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.webinar_registrations enable row level security;
alter table public.resource_feedback enable row level security;
alter table public.resource_feedback_votes enable row level security;
alter table public.resource_reports enable row level security;
alter table public.community_groups enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_memberships enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "resources_select_authenticated" on public.resources;
create policy "resources_select_authenticated"
on public.resources
for select
to authenticated
using (true);

drop policy if exists "resource_feedback_select_authenticated" on public.resource_feedback;
create policy "resource_feedback_select_authenticated"
on public.resource_feedback
for select
to authenticated
using (true);

drop policy if exists "resource_feedback_insert_own" on public.resource_feedback;
create policy "resource_feedback_insert_own"
on public.resource_feedback
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "resource_feedback_update_own" on public.resource_feedback;
create policy "resource_feedback_update_own"
on public.resource_feedback
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "resource_feedback_delete_moderated" on public.resource_feedback;
create policy "resource_feedback_delete_moderated"
on public.resource_feedback
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "resource_feedback_votes_select_authenticated" on public.resource_feedback_votes;
create policy "resource_feedback_votes_select_authenticated"
on public.resource_feedback_votes
for select
to authenticated
using (true);

drop policy if exists "resource_feedback_votes_insert_own" on public.resource_feedback_votes;
create policy "resource_feedback_votes_insert_own"
on public.resource_feedback_votes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "resource_feedback_votes_delete_own" on public.resource_feedback_votes;
create policy "resource_feedback_votes_delete_own"
on public.resource_feedback_votes
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "resource_reports_select_admin" on public.resource_reports;
create policy "resource_reports_select_admin"
on public.resource_reports
for select
to authenticated
using (public.is_admin() or exists (
  select 1 from public.profiles
  where id = auth.uid() and role = 'moderator'
));

drop policy if exists "resource_reports_insert_own" on public.resource_reports;
create policy "resource_reports_insert_own"
on public.resource_reports
for insert
to authenticated
with check (auth.uid() = reported_by);

drop policy if exists "community_groups_select_authenticated" on public.community_groups;
create policy "community_groups_select_authenticated"
on public.community_groups
for select
to authenticated
using (true);

drop policy if exists "community_groups_insert_teacher_or_staff" on public.community_groups;
create policy "community_groups_insert_teacher_or_staff"
on public.community_groups
for insert
to authenticated
with check (
  auth.uid() = created_by and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'moderator', 'organizator', 'profesor')
  )
);

drop policy if exists "community_groups_update_owner_or_staff" on public.community_groups;
create policy "community_groups_update_owner_or_staff"
on public.community_groups
for update
to authenticated
using (
  auth.uid() = created_by
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
)
with check (
  auth.uid() = created_by
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

drop policy if exists "community_groups_delete_owner_or_staff" on public.community_groups;
create policy "community_groups_delete_owner_or_staff"
on public.community_groups
for delete
to authenticated
using (
  auth.uid() = created_by
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

drop policy if exists "community_posts_select_authenticated" on public.community_posts;
create policy "community_posts_select_authenticated"
on public.community_posts
for select
to authenticated
using (true);

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_owned_or_staff" on public.community_posts;
create policy "community_posts_update_owned_or_staff"
on public.community_posts
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
)
with check (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

drop policy if exists "community_posts_delete_owned_or_staff" on public.community_posts;
create policy "community_posts_delete_owned_or_staff"
on public.community_posts
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

drop policy if exists "community_memberships_select_authenticated" on public.community_memberships;
create policy "community_memberships_select_authenticated"
on public.community_memberships
for select
to authenticated
using (true);

drop policy if exists "community_memberships_insert_own" on public.community_memberships;
create policy "community_memberships_insert_own"
on public.community_memberships
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_memberships_delete_own_or_staff" on public.community_memberships;
create policy "community_memberships_delete_own_or_staff"
on public.community_memberships
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

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

drop policy if exists "webinars_select_own" on public.webinar_registrations;
create policy "webinars_select_own"
on public.webinar_registrations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "webinars_insert_own" on public.webinar_registrations;
create policy "webinars_insert_own"
on public.webinar_registrations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "webinars_select_admin" on public.webinar_registrations;
create policy "webinars_select_admin"
on public.webinar_registrations
for select
to authenticated
using (public.is_admin());

drop policy if exists "resources_delete_own" on public.resources;
create policy "resources_delete_own"
on public.resources
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "resources_update_admin" on public.resources;
create policy "resources_update_admin"
on public.resources
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "resources_delete_admin" on public.resources;
create policy "resources_delete_admin"
on public.resources
for delete
to authenticated
using (public.is_admin());

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

drop policy if exists "storage_delete_own_folder" on storage.objects;
create policy "storage_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resources' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "storage_delete_admin" on storage.objects;
create policy "storage_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resources' and
  public.is_admin()
);

-- Dupa ce creezi primul cont in Auth, promoveaza-l manual la admin:
-- update public.profiles set role = 'admin' where email = 'adminul-tau@exemplu.ro';
