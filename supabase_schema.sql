-- ============================================================================
-- MS Planner — Esquema Supabase (PostgreSQL) · v2 (Fase 2: datos en Postgres)
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
-- Modelo de datos:
--   Cada entidad tiene su tabla con columnas legibles (para reportes/consultas
--   SQL) MÁS una columna `data jsonb` con el objeto completo de la app, de modo
--   que la hidratación en el navegador sea 100% fiel. La app usa el `id` que ella
--   misma asigna (por eso los PK no son identity). El orden de fila se guarda en
--   `ord`. Los "overrides"/config van en la tabla clave-valor `app_state`.
--
-- Seguridad: RLS en todo. SELECT = usuario autenticado; escritura = Nivel 1 y 2.
-- Usa la anon key (pública, segura con RLS). NUNCA la service_role key.
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

create or replace function public.current_level()
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select access_level from public.profiles where id = auth.uid()), 3);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, access_level)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          coalesce((new.raw_user_meta_data->>'access_level')::int, 3))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.current_level() = 1);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.current_level() = 1);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (public.current_level() = 1 or id = auth.uid());
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (public.current_level() = 1);

-- ------------------------------------------------------------------
-- 2) TABLAS DE DATOS (columnas legibles + ord + data jsonb)
--    El id lo asigna la app (no identity).
-- ------------------------------------------------------------------

create table if not exists public.groups (
  id         bigint primary key,
  ord        int default 0,
  name       text,
  overseer   text,
  assistant  text,
  data       jsonb not null default '{}'::jsonb
);

create table if not exists public.publishers (
  id         bigint primary key,
  ord        int default 0,
  full_name  text,
  first_name text,
  last_name  text,
  sex        text,
  group_id   bigint,
  role       text,
  status     text,
  email      text,
  phone      text,
  data       jsonb not null default '{}'::jsonb
);

create table if not exists public.territories (
  id             bigint primary key,
  ord            int default 0,
  number         text,
  neighborhood   text,
  locality       text,
  status         text,
  responsible_id bigint,
  data           jsonb not null default '{}'::jsonb
);

create table if not exists public.territory_assignments (
  id           text primary key,        -- la app usa ids como 'ta0','ta1'
  ord          int default 0,
  assign_date  date,
  captain_id   bigint,
  confirmation text,
  notes        text,
  data         jsonb not null default '{}'::jsonb
);

create table if not exists public.do_not_call (
  id               bigint primary key,
  ord              int default 0,
  territory_number text,
  address          text,
  locality         text,
  reason           text,
  notes            text,
  data             jsonb not null default '{}'::jsonb
);

create table if not exists public.tasks (
  id          bigint primary key,
  ord         int default 0,
  title       text,
  description text,
  priority    text,
  status      text,
  progress    int,
  data        jsonb not null default '{}'::jsonb
);

create table if not exists public.reports (
  id           bigint primary key,
  ord          int default 0,
  publisher_id bigint,
  period       text,
  submitted    boolean,
  hours        int,
  studies      int,
  pioneer      boolean,
  data         jsonb not null default '{}'::jsonb
);

create table if not exists public.announcements (
  id    bigint primary key,
  ord   int default 0,
  title text,
  body  text,
  data  jsonb not null default '{}'::jsonb
);

create table if not exists public.events (
  id     bigint primary key,
  ord    int default 0,
  name   text,
  detail text,
  data   jsonb not null default '{}'::jsonb
);

-- Clave-valor para overrides/config/asistencia/notificaciones (objetos, no listas)
create table if not exists public.app_state (
  key        text primary key,   -- 'meetOvr','discOvr','exhibOvr','congCfg','attReg','notifs','taSeq'
  value      jsonb,
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------
-- 3) RLS: SELECT para autenticados; escritura (insert/update/delete) Nivel 1 y 2
-- ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'groups','publishers','territories','territory_assignments','do_not_call',
    'tasks','reports','announcements','events','app_state'
  ] loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t||'_sel', t);
    execute format($f$create policy %I on public.%I for select using (auth.role() = 'authenticated');$f$, t||'_sel', t);

    execute format('drop policy if exists %I on public.%I;', t||'_ins', t);
    execute format($f$create policy %I on public.%I for insert with check (public.current_level() <= 2);$f$, t||'_ins', t);

    execute format('drop policy if exists %I on public.%I;', t||'_upd', t);
    execute format($f$create policy %I on public.%I for update using (public.current_level() <= 2);$f$, t||'_upd', t);

    execute format('drop policy if exists %I on public.%I;', t||'_del', t);
    execute format($f$create policy %I on public.%I for delete using (public.current_level() <= 2);$f$, t||'_del', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 4) Índices útiles para consultas/reportes
-- ------------------------------------------------------------------
create index if not exists idx_publishers_group on public.publishers(group_id);
create index if not exists idx_publishers_status on public.publishers(status);
create index if not exists idx_reports_publisher on public.reports(publisher_id);
create index if not exists idx_territories_status on public.territories(status);

-- ============================================================================
-- FIN. Después de ejecutar:
--   · Crea usuarios en Authentication → Users (marca "Auto Confirm User").
--   · Marca al administrador principal como Nivel 1:
--       update public.profiles set access_level = 1 where email = 'TU_CORREO';
--   · Al iniciar sesión por primera vez con la app configurada, si las tablas
--     están vacías, la app SIEMBRA automáticamente los datos de ejemplo.
--     Consulta luego las tablas: select full_name, role, status from publishers;
-- ============================================================================
