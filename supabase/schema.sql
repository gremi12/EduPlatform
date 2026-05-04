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

alter table public.profiles
add column if not exists account_status text not null default 'active';

alter table public.profiles
add column if not exists status_note text not null default '';

alter table public.profiles
drop constraint if exists profiles_account_status_check;

alter table public.profiles
add constraint profiles_account_status_check
check (account_status in ('active', 'banned', 'disabled'));

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

create table if not exists public.webinar_courses (
  slug text primary key,
  title text not null,
  subtitle text not null default '',
  presenter_name text not null default '',
  scheduled_label text not null default '',
  summary text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webinar_course_lessons (
  id uuid primary key default gen_random_uuid(),
  webinar_slug text not null,
  lesson_title text not null,
  lesson_description text not null default '',
  video_url text not null,
  video_source_type text not null default 'embed',
  video_storage_path text,
  duration_minutes integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.webinar_course_lessons
add column if not exists video_source_type text not null default 'embed';

alter table public.webinar_course_lessons
add column if not exists video_storage_path text;

alter table public.webinar_course_lessons
drop constraint if exists webinar_course_lessons_video_source_type_check;

alter table public.webinar_course_lessons
add constraint webinar_course_lessons_video_source_type_check
check (video_source_type in ('embed', 'file'));

create unique index if not exists webinar_course_lessons_slug_title_key
on public.webinar_course_lessons (webinar_slug, lesson_title);

create index if not exists webinar_course_lessons_slug_sort_idx
on public.webinar_course_lessons (webinar_slug, sort_order, created_at);

create table if not exists public.webinar_lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.webinar_course_lessons(id) on delete cascade,
  webinar_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

create table if not exists public.community_topics (
  id uuid primary key default gen_random_uuid(),
  group_slug text not null references public.community_groups(slug) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_topic_messages (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.community_topics(id) on delete cascade,
  group_slug text not null references public.community_groups(slug) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

insert into public.webinar_courses (
  slug,
  title,
  subtitle,
  presenter_name,
  scheduled_label,
  summary,
  is_published
)
values
  ('strategii-predare', 'Strategii de predare eficiente', 'Metode practice pentru implicarea elevilor si proiectarea lectiilor moderne.', 'Dr. Maria Popa', '12 Mai 2026 · 17:00', 'Curs pentru profesori care vor sa-si structureze mai bine lectiile si interactiunea la clasa.', true),
  ('instrumente-digitale', 'Instrumente digitale pentru clasa', 'Aplicatii si fluxuri digitale care ii ajuta pe profesori sa organizeze lectii interactive.', 'Andrei Vasile', '18 Mai 2026 · 18:00', 'Introducere in instrumente digitale usor de aplicat la clasa.', true),
  ('evaluare-moderna', 'Evaluare moderna', 'Exemple de evaluare formativa, feedback eficient si rubrici moderne.', 'Elena Rusu', '25 Mai 2026 · 16:30', 'Idei concrete pentru evaluare clara si feedback util pentru elevi.', true)
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  presenter_name = excluded.presenter_name,
  scheduled_label = excluded.scheduled_label,
  summary = excluded.summary,
  is_published = excluded.is_published,
  updated_at = timezone('utc', now());

insert into public.webinar_course_lessons (
  webinar_slug,
  lesson_title,
  lesson_description,
  video_url,
  video_source_type,
  duration_minutes,
  sort_order
)
values
  ('strategii-predare', 'Lectia 1 - Structura unei lectii eficiente', 'Cadru clar pentru deschidere, activare si evaluare rapida in clasa.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 28, 1),
  ('strategii-predare', 'Lectia 2 - Activitati pentru implicarea elevilor', 'Exemple practice de lucru in perechi, reflexie si recapitulare.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 34, 2),
  ('instrumente-digitale', 'Lectia 1 - Organizarea cursului in Google Workspace', 'Cum structurezi teme, materiale si feedback digital pentru elevi.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 31, 1),
  ('instrumente-digitale', 'Lectia 2 - Resurse interactive si evaluare rapida', 'Idei pentru quiz-uri, formulare si activitati colaborative.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 26, 2),
  ('evaluare-moderna', 'Lectia 1 - Rubrici si criterii de evaluare', 'Construirea unor criterii clare si usor de explicat elevilor.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 29, 1),
  ('evaluare-moderna', 'Lectia 2 - Feedback scurt, clar si util', 'Modele de feedback rapid pentru teme, proiecte si raspunsuri orale.', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'embed', 24, 2)
on conflict (webinar_slug, lesson_title) do update
set
  lesson_description = excluded.lesson_description,
  video_url = excluded.video_url,
  video_source_type = excluded.video_source_type,
  duration_minutes = excluded.duration_minutes,
  sort_order = excluded.sort_order;

insert into public.community_topics (group_slug, created_by, title, description)
select
  groups.slug,
  groups.created_by,
  'Intrebari generale',
  'Tema de baza pentru intrebari, idei si schimburi rapide din comunitate.'
from public.community_groups as groups
where not exists (
  select 1
  from public.community_topics as topics
  where topics.group_slug = groups.slug
    and topics.title = 'Intrebari generale'
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
    email,
    role,
    class_level,
    enrolled_classes,
    account_status,
    status_note
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
    end,
    'active',
    ''
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
    account_status = coalesce(public.profiles.account_status, 'active'),
    status_note = coalesce(public.profiles.status_note, ''),
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

create or replace function public.get_community_topics(p_group_slug text)
returns table (
  id uuid,
  group_slug text,
  title text,
  description text,
  created_by uuid,
  author_name text,
  message_count bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    topics.id,
    topics.group_slug,
    topics.title,
    topics.description,
    topics.created_by,
    coalesce(profiles.full_name, 'Membru comunitate') as author_name,
    count(messages.id) as message_count,
    topics.created_at
  from public.community_topics as topics
  left join public.profiles as profiles
    on profiles.id = topics.created_by
  left join public.community_topic_messages as messages
    on messages.topic_id = topics.id
  where auth.uid() is not null
    and topics.group_slug = p_group_slug
  group by topics.id, topics.group_slug, topics.title, topics.description, topics.created_by, profiles.full_name, topics.created_at
  order by topics.created_at desc;
$$;

create or replace function public.get_topic_messages(p_topic_id uuid)
returns table (
  id uuid,
  topic_id uuid,
  group_slug text,
  user_id uuid,
  full_name text,
  role text,
  message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    messages.id,
    messages.topic_id,
    messages.group_slug,
    messages.user_id,
    coalesce(profiles.full_name, 'Membru comunitate') as full_name,
    coalesce(profiles.role, 'elev') as role,
    messages.message,
    messages.created_at
  from public.community_topic_messages as messages
  left join public.profiles as profiles
    on profiles.id = messages.user_id
  where auth.uid() is not null
    and messages.topic_id = p_topic_id
  order by messages.created_at asc;
$$;

create or replace function public.get_webinar_lesson_comments(p_lesson_id uuid)
returns table (
  id uuid,
  lesson_id uuid,
  user_id uuid,
  full_name text,
  role text,
  comment text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    comments.id,
    comments.lesson_id,
    comments.user_id,
    coalesce(profiles.full_name, 'Membru EduPlatform') as full_name,
    coalesce(profiles.role, 'elev') as role,
    comments.comment,
    comments.created_at
  from public.webinar_lesson_comments as comments
  left join public.profiles as profiles
    on profiles.id = comments.user_id
  where auth.uid() is not null
    and comments.lesson_id = p_lesson_id
  order by comments.created_at asc;
$$;

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.webinar_registrations enable row level security;
alter table public.webinar_courses enable row level security;
alter table public.webinar_course_lessons enable row level security;
alter table public.webinar_lesson_comments enable row level security;
alter table public.resource_feedback enable row level security;
alter table public.resource_feedback_votes enable row level security;
alter table public.resource_reports enable row level security;
alter table public.community_groups enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_topics enable row level security;
alter table public.community_topic_messages enable row level security;

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
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1
      from public.community_memberships
      where group_slug = public.community_posts.group_slug
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'moderator', 'organizator')
    )
  )
);

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

drop policy if exists "community_topics_select_authenticated" on public.community_topics;
create policy "community_topics_select_authenticated"
on public.community_topics
for select
to authenticated
using (true);

drop policy if exists "community_topics_insert_member_or_staff" on public.community_topics;
create policy "community_topics_insert_member_or_staff"
on public.community_topics
for insert
to authenticated
with check (
  auth.uid() = created_by
  and (
    exists (
      select 1
      from public.community_memberships
      where group_slug = public.community_topics.group_slug
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'moderator', 'organizator')
    )
  )
);

drop policy if exists "community_topics_update_owner_or_staff" on public.community_topics;
create policy "community_topics_update_owner_or_staff"
on public.community_topics
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

drop policy if exists "community_topics_delete_owner_or_staff" on public.community_topics;
create policy "community_topics_delete_owner_or_staff"
on public.community_topics
for delete
to authenticated
using (
  auth.uid() = created_by
  or public.is_admin()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')
);

drop policy if exists "community_topic_messages_select_authenticated" on public.community_topic_messages;
create policy "community_topic_messages_select_authenticated"
on public.community_topic_messages
for select
to authenticated
using (true);

drop policy if exists "community_topic_messages_insert_member_or_staff" on public.community_topic_messages;
create policy "community_topic_messages_insert_member_or_staff"
on public.community_topic_messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1
      from public.community_memberships
      where group_slug = public.community_topic_messages.group_slug
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'moderator', 'organizator')
    )
  )
);

drop policy if exists "community_topic_messages_update_owner_or_staff" on public.community_topic_messages;
create policy "community_topic_messages_update_owner_or_staff"
on public.community_topic_messages
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

drop policy if exists "community_topic_messages_delete_owner_or_staff" on public.community_topic_messages;
create policy "community_topic_messages_delete_owner_or_staff"
on public.community_topic_messages
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

drop policy if exists "webinar_courses_select_authenticated" on public.webinar_courses;
create policy "webinar_courses_select_authenticated"
on public.webinar_courses
for select
to authenticated
using (true);

drop policy if exists "webinar_courses_insert_admin" on public.webinar_courses;
create policy "webinar_courses_insert_admin"
on public.webinar_courses
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "webinar_courses_update_admin" on public.webinar_courses;
create policy "webinar_courses_update_admin"
on public.webinar_courses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "webinar_courses_delete_admin" on public.webinar_courses;
create policy "webinar_courses_delete_admin"
on public.webinar_courses
for delete
to authenticated
using (public.is_admin());

drop policy if exists "webinar_lessons_select_registered" on public.webinar_course_lessons;
create policy "webinar_lessons_select_registered"
on public.webinar_course_lessons
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.webinar_registrations
    where user_id = auth.uid()
      and webinar_slug = public.webinar_course_lessons.webinar_slug
  )
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'organizator')
  )
);

drop policy if exists "webinar_lessons_insert_admin" on public.webinar_course_lessons;
create policy "webinar_lessons_insert_admin"
on public.webinar_course_lessons
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "webinar_lessons_update_admin" on public.webinar_course_lessons;
create policy "webinar_lessons_update_admin"
on public.webinar_course_lessons
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "webinar_lessons_delete_admin" on public.webinar_course_lessons;
create policy "webinar_lessons_delete_admin"
on public.webinar_course_lessons
for delete
to authenticated
using (public.is_admin());

drop policy if exists "webinar_lesson_comments_select_allowed" on public.webinar_lesson_comments;
create policy "webinar_lesson_comments_select_allowed"
on public.webinar_lesson_comments
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.webinar_registrations
    where user_id = auth.uid()
      and webinar_slug = public.webinar_lesson_comments.webinar_slug
  )
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'organizator')
  )
);

drop policy if exists "webinar_lesson_comments_insert_allowed" on public.webinar_lesson_comments;
create policy "webinar_lesson_comments_insert_allowed"
on public.webinar_lesson_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    public.is_admin()
    or exists (
      select 1
      from public.webinar_registrations
      where user_id = auth.uid()
        and webinar_slug = public.webinar_lesson_comments.webinar_slug
    )
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'organizator')
    )
  )
);

drop policy if exists "webinar_lesson_comments_update_own_or_admin" on public.webinar_lesson_comments;
create policy "webinar_lesson_comments_update_own_or_admin"
on public.webinar_lesson_comments
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "webinar_lesson_comments_delete_own_or_admin" on public.webinar_lesson_comments;
create policy "webinar_lesson_comments_delete_own_or_admin"
on public.webinar_lesson_comments
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

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

insert into storage.buckets (id, name, public)
values ('webinar-videos', 'webinar-videos', false)
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

drop policy if exists "webinar_video_select_authenticated" on storage.objects;
create policy "webinar_video_select_authenticated"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'webinar-videos'
);

drop policy if exists "webinar_video_insert_admin" on storage.objects;
create policy "webinar_video_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'webinar-videos' and
  public.is_admin()
);

drop policy if exists "webinar_video_update_admin" on storage.objects;
create policy "webinar_video_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'webinar-videos' and
  public.is_admin()
)
with check (
  bucket_id = 'webinar-videos' and
  public.is_admin()
);

drop policy if exists "webinar_video_delete_admin" on storage.objects;
create policy "webinar_video_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'webinar-videos' and
  public.is_admin()
);
