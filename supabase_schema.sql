-- ============================================================================
-- MS Planner — Esquema Supabase (PostgreSQL) · v1
-- ----------------------------------------------------------------------------
-- Cómo usar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa "Run".
--   3. Crea tus usuarios en Authentication → Users (ver SETUP_SUPABASE.md).
--
-- Modelo de roles (access_level):
--   1 = Administrador Global   (acceso total: usuarios, configuración, datos)
--   2 = Administrador de Datos (gestiona datos de la congregación)
--   3 = Usuario Estándar       (consulta y registro básico)  ← valor por defecto
--
-- Seguridad: todas las tablas usan Row Level Security (RLS). La app usa la
-- anon key (pública, segura con RLS). NUNCA expongas la service_role key.
-- ============================================================================

-- ------------------------------------------------------------------
-- 1) PERFILES (1:1 con auth.users) + nivel de acceso
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  access_level int  not null default 3 check (access_level in (1,2,3)),
  congregation text default 'Las Flores',
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;

-- Nivel del usuario actual. SECURITY DEFINER evita recursión de RLS al leer profiles.
create or replace function public.current_level()
returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select access_level from public.profiles where id = auth.uid()), 3);
$$;

-- Al registrarse un usuario en Auth, se crea su perfil (nivel 3 por defecto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, access_level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'access_level')::int, 3)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS de profiles: cada quien ve/edita el suyo; el Nivel 1 administra todos.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.current_level() = 1);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.current_level() = 1);

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.current_level() = 1 or id = auth.uid());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.current_level() = 1);

-- ------------------------------------------------------------------
-- 2) DATOS DE LA CONGREGACIÓN
--    Convención de acceso:
--      · SELECT  → cualquier usuario autenticado (Nivel 1/2/3)
--      · INSERT/UPDATE/DELETE → Nivel 1 y 2 (current_level() <= 2)
--    (Se aplica con un helper de políticas al final.)
-- ------------------------------------------------------------------

-- Grupos de servicio del campo
create table if not exists public.groups (
  id         bigint generated always as identity primary key,
  name       text not null,
  overseer   text,
  assistant  text,
  created_at timestamptz default now()
);

-- Publicadores (CRM)
create table if not exists public.publishers (
  id            bigint generated always as identity primary key,
  first_name    text,
  last_name     text,
  full_name     text not null,
  sex           text check (sex in ('M','F')),
  group_id      bigint references public.groups(id) on delete set null,
  phone         text,
  email         text,
  birth_date    date,
  address       text,
  locality      text,
  role          text,               -- privilegio primario (Anciano, Precursor…)
  privileges    text[] default '{}',
  access_level  int,                -- nivel de acceso sugerido para su usuario
  status        text default 'Activo' check (status in ('Activo','Irregular','Inactivo')),
  baptism_date  date,
  appointment_date date,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Territorios
create table if not exists public.territories (
  id            bigint generated always as identity primary key,
  number        text not null unique,
  locality      text,
  neighborhood  text,
  responsible_id bigint references public.publishers(id) on delete set null,
  status        text default 'Pendiente' check (status in ('Completado','Activo','Pendiente','Vencido')),
  assigned_date date,
  completed_date date,
  blocks        int,
  households    int,
  maps_url      text,
  image_url     text,
  created_at    timestamptz default now()
);

-- Asignaciones de predicación diaria (multi-territorio por día)
create table if not exists public.territory_assignments (
  id            bigint generated always as identity primary key,
  assign_date   date not null,
  captain_id    bigint references public.publishers(id) on delete set null,
  territory_numbers text[] default '{}',
  confirmation  text default 'pend' check (confirmation in ('pend','conf','rech')),
  notes         text,
  created_at    timestamptz default now()
);

-- Casas donde no se predica
create table if not exists public.do_not_call (
  id             bigint generated always as identity primary key,
  territory_number text,
  address        text not null,
  locality       text,
  reason         text,
  logged_date    date default now(),
  notes          text
);

-- Tareas
create table if not exists public.tasks (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text,
  created_by   text,
  assignee_id  bigint references public.publishers(id) on delete set null,
  due_date     date,
  priority     text default 'Media' check (priority in ('Alta','Media','Baja')),
  status       text default 'Pendiente' check (status in ('Pendiente','Completada')),
  progress     int default 0,
  created_at   timestamptz default now()
);

-- Informes mensuales
create table if not exists public.reports (
  id           bigint generated always as identity primary key,
  publisher_id bigint references public.publishers(id) on delete cascade,
  period       text not null,           -- 'YYYY-MM'
  submitted    boolean default false,
  hours        int default 0,
  studies      int default 0,
  pioneer      boolean default false,
  created_at   timestamptz default now(),
  unique (publisher_id, period)
);

-- Registro de asistencia por reunión
create table if not exists public.attendance (
  id            bigint generated always as identity primary key,
  meeting_date  date not null,
  meeting_type  text not null check (meeting_type in ('mid','we')),
  count         int not null,
  zoom          int default 0,
  notes         text,
  unique (meeting_date, meeting_type)
);

-- Asignaciones de partes de reunión (overrides sobre el programa generado)
create table if not exists public.meeting_assignments (
  id            bigint generated always as identity primary key,
  meeting_date  date not null,
  meeting_type  text not null check (meeting_type in ('mid','we')),
  part_role     text not null,
  publisher_id  bigint references public.publishers(id) on delete set null,
  confirmed     boolean default false,
  unique (meeting_date, meeting_type, part_role)
);

-- Discursos públicos
create table if not exists public.public_talks (
  id            bigint generated always as identity primary key,
  talk_date     date not null unique,
  speaker_id    bigint references public.publishers(id) on delete set null,
  outline_no    int,
  song_no       int,
  theme         text,
  congregation  text
);

-- Turnos de exhibidores
create table if not exists public.exhibitor_shifts (
  id            bigint generated always as identity primary key,
  exhibitor     text not null,
  shift_date    date not null,
  slot_index    int  not null,
  publisher1_id bigint references public.publishers(id) on delete set null,
  publisher2_id bigint references public.publishers(id) on delete set null,
  vacant        boolean default false,
  unique (exhibitor, shift_date, slot_index)
);

-- Anuncios
create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  title       text not null,
  body        text,
  created_at  timestamptz default now()
);

-- Eventos del calendario
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  name        text not null,
  detail      text,
  event_date  date,
  created_at  timestamptz default now()
);

-- Configuración de la congregación (clave/valor)
create table if not exists public.congregation_config (
  key   text primary key,
  value text
);

-- ------------------------------------------------------------------
-- 3) RLS: SELECT para autenticados; escritura para Nivel 1 y 2
--    Se generan políticas idénticas para cada tabla de datos.
-- ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'groups','publishers','territories','territory_assignments','do_not_call',
    'tasks','reports','attendance','meeting_assignments','public_talks',
    'exhibitor_shifts','announcements','events','congregation_config'
  ] loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t||'_sel', t);
    execute format($f$create policy %I on public.%I for select
      using (auth.role() = 'authenticated');$f$, t||'_sel', t);

    execute format('drop policy if exists %I on public.%I;', t||'_ins', t);
    execute format($f$create policy %I on public.%I for insert
      with check (public.current_level() <= 2);$f$, t||'_ins', t);

    execute format('drop policy if exists %I on public.%I;', t||'_upd', t);
    execute format($f$create policy %I on public.%I for update
      using (public.current_level() <= 2);$f$, t||'_upd', t);

    execute format('drop policy if exists %I on public.%I;', t||'_del', t);
    execute format($f$create policy %I on public.%I for delete
      using (public.current_level() <= 2);$f$, t||'_del', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 4) (Opcional) Índices útiles
-- ------------------------------------------------------------------
create index if not exists idx_publishers_group on public.publishers(group_id);
create index if not exists idx_reports_period    on public.reports(period);
create index if not exists idx_attendance_date   on public.attendance(meeting_date);
create index if not exists idx_talks_date        on public.public_talks(talk_date);

-- ============================================================================
-- FIN. Después de ejecutar:
--   · Crea usuarios en Authentication → Users.
--   · Marca al administrador principal como Nivel 1:
--       update public.profiles set access_level = 1 where email = 'TU_CORREO';
-- ============================================================================
