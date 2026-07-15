-- ============================================================================
-- MS Planner — Migración: Backend de la App del Publicador (Nivel 4)  ·  Fase B
-- ----------------------------------------------------------------------------
-- Requiere haber corrido antes: supabase_schema.sql + supabase_migration_roles.sql
-- Ejecutar completo en: Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente (se puede correr más de una vez sin romper nada).
--
-- Qué hace:
--   1. Vincula cada cuenta con su ficha de publicador: profiles.publisher_id
--      + helper current_publisher_id() para las políticas RLS.
--   2. Deja que el Publicador (Nivel 4) lea/edite SUS datos de contacto
--      (publisher_private) sin exponer los de los demás.
--   3. Crea tablas PROPIAS del publicador que el panel admin LEE pero NO
--      reemplaza en su sincronización (evita que el "reemplazo total" del
--      admin borre lo que escribe el publicador):
--        · field_reports         — informe mensual de predicación
--        · assignment_responses  — confirmar/rechazar asignaciones
--   4. Crea public.assignments — asignaciones (reunión y campo) por publicador,
--      gestionadas por Nivel ≤3, visibles para su publicador.
--
-- NOTA de arquitectura: NO reutilizamos la tabla `reports` para lo que escribe
-- el publicador porque el admin la sincroniza con id = índice de su arreglo y
-- borra lo que no tiene en memoria; un informe creado por el publicador allí
-- sería eliminado. `field_reports` es de escritura del publicador; el admin la
-- consulta para estadísticas.
-- ============================================================================

-- 1) VÍNCULO cuenta ↔ ficha ---------------------------------------------------
alter table public.profiles add column if not exists publisher_id bigint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_publisher_fk') then
    alter table public.profiles
      add constraint profiles_publisher_fk
      foreign key (publisher_id) references public.publishers(id) on delete set null;
  end if;
end $$;

create index if not exists idx_profiles_publisher on public.profiles(publisher_id);

-- helper: id de publicador de la cuenta autenticada (para RLS)
create or replace function public.current_publisher_id()
returns bigint language sql stable security definer set search_path = public as $$
  select publisher_id from public.profiles where id = auth.uid();
$$;

-- El helper handle_new_user ya no necesita cambios: el admin asigna el vínculo
-- luego, desde la pantalla Usuarios (set_publisher). Ver SETUP_USERS.md.

-- 2) El Publicador lee/edita SUS datos de contacto ---------------------------
--    (publisher_private.select estaba restringido a Nivel ≤2; añadimos el "propio")
drop policy if exists publisher_private_sel_own on public.publisher_private;
create policy publisher_private_sel_own on public.publisher_private
  for select using (id = public.current_publisher_id());

drop policy if exists publisher_private_ins_own on public.publisher_private;
create policy publisher_private_ins_own on public.publisher_private
  for insert with check (id = public.current_publisher_id());

drop policy if exists publisher_private_upd_own on public.publisher_private;
create policy publisher_private_upd_own on public.publisher_private
  for update using (id = public.current_publisher_id())
  with check (id = public.current_publisher_id());

-- 3a) INFORME MENSUAL del publicador -----------------------------------------
create table if not exists public.field_reports (
  id           bigserial primary key,
  publisher_id bigint not null references public.publishers(id) on delete cascade,
  period       text   not null,                 -- 'YYYY-MM'
  submitted    boolean default false,
  hours        int default 0,
  minutes      int default 0,
  studies      int default 0,
  revisits     int default 0,
  publications int default 0,
  videos       int default 0,
  pioneer      boolean default false,
  notes        text,
  submitted_at timestamptz,
  updated_at   timestamptz default now(),
  unique (publisher_id, period)
);
create index if not exists idx_field_reports_pub on public.field_reports(publisher_id);
create index if not exists idx_field_reports_period on public.field_reports(period);
alter table public.field_reports enable row level security;

-- lectura: admins ≤2 (para estadísticas) o el propio publicador
drop policy if exists field_reports_sel on public.field_reports;
create policy field_reports_sel on public.field_reports for select
  using (public.current_level() <= 2 or publisher_id = public.current_publisher_id());

-- escritura del propio publicador
drop policy if exists field_reports_ins_own on public.field_reports;
create policy field_reports_ins_own on public.field_reports for insert
  with check (publisher_id = public.current_publisher_id());
drop policy if exists field_reports_upd_own on public.field_reports;
create policy field_reports_upd_own on public.field_reports for update
  using (publisher_id = public.current_publisher_id())
  with check (publisher_id = public.current_publisher_id());

-- escritura de admins ≤2 (correcciones)
drop policy if exists field_reports_ins_adm on public.field_reports;
create policy field_reports_ins_adm on public.field_reports for insert
  with check (public.current_level() <= 2);
drop policy if exists field_reports_upd_adm on public.field_reports;
create policy field_reports_upd_adm on public.field_reports for update
  using (public.current_level() <= 2);
drop policy if exists field_reports_del_adm on public.field_reports;
create policy field_reports_del_adm on public.field_reports for delete
  using (public.current_level() <= 2);

-- 3b) ASIGNACIONES por publicador (gestión Nivel ≤3) -------------------------
create table if not exists public.assignments (
  id           bigserial primary key,
  publisher_id bigint references public.publishers(id) on delete cascade,
  kind         text,                  -- 'meeting' | 'field'
  category     text,                  -- icono: 'book','mic','people','map',…
  title        text,                  -- 'Lectura de la Biblia'
  assign_date  date,
  time_label   text,                  -- '7:30 p.m.'
  meeting      text,                  -- 'Entre semana' | 'Territorio #017'
  description  text,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz default now()
);
create index if not exists idx_assignments_pub on public.assignments(publisher_id);
create index if not exists idx_assignments_date on public.assignments(assign_date);
alter table public.assignments enable row level security;

drop policy if exists assignments_sel on public.assignments;
create policy assignments_sel on public.assignments for select
  using (public.current_level() <= 3 or publisher_id = public.current_publisher_id());
drop policy if exists assignments_ins on public.assignments;
create policy assignments_ins on public.assignments for insert
  with check (public.current_level() <= 3);
drop policy if exists assignments_upd on public.assignments;
create policy assignments_upd on public.assignments for update
  using (public.current_level() <= 3);
drop policy if exists assignments_del on public.assignments;
create policy assignments_del on public.assignments for delete
  using (public.current_level() <= 3);

-- 3c) RESPUESTA del publicador a una asignación (confirmar/rechazar) ----------
--     Tabla aparte para que la gestión del admin no pise la respuesta.
create table if not exists public.assignment_responses (
  assignment_id bigint primary key references public.assignments(id) on delete cascade,
  publisher_id  bigint not null references public.publishers(id) on delete cascade,
  status        text default 'pend',          -- 'pend' | 'conf' | 'decline'
  note          text,
  responded_at  timestamptz default now()
);
create index if not exists idx_assignment_resp_pub on public.assignment_responses(publisher_id);
alter table public.assignment_responses enable row level security;

drop policy if exists assignment_responses_sel on public.assignment_responses;
create policy assignment_responses_sel on public.assignment_responses for select
  using (public.current_level() <= 3 or publisher_id = public.current_publisher_id());
drop policy if exists assignment_responses_ins_own on public.assignment_responses;
create policy assignment_responses_ins_own on public.assignment_responses for insert
  with check (publisher_id = public.current_publisher_id());
drop policy if exists assignment_responses_upd_own on public.assignment_responses;
create policy assignment_responses_upd_own on public.assignment_responses for update
  using (publisher_id = public.current_publisher_id())
  with check (publisher_id = public.current_publisher_id());

-- ============================================================================
-- FIN. Notas:
--   · `announcements` ya tiene SELECT para autenticados → el Publicador ya
--     puede leer los anuncios sin cambios.
--   · La META mensual de horas se guarda por publicador en
--     publisher_private.data.metaHoras (opcional; por defecto 0 = sin meta).
--   · Para vincular una cuenta a su ficha (hasta tener el selector en la app):
--       update public.profiles set publisher_id = 12 where email = 'jairo@...';
--   · Verifica el vínculo:
--       select p.email, p.access_level, p.publisher_id, pb.full_name
--       from public.profiles p left join public.publishers pb on pb.id = p.publisher_id;
-- ============================================================================
