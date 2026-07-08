-- ============================================================================
-- MS Planner — Migración: 4 roles + datos personales sensibles separados
-- ----------------------------------------------------------------------------
-- Para proyectos que YA corrieron supabase_schema.sql (v2) y tienen datos.
-- Ejecutar completo en: Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente (se puede correr más de una vez sin romper nada).
--
-- Qué hace:
--   1. Permite el Nivel 4 (Publicador) en los perfiles.
--   2. Crea la tabla publisher_private para teléfono/dirección/correo/nacimiento
--      y MUEVE allí esos datos, sacándolos de la tabla pública `publishers`.
--   3. Restringe la lectura de datos sensibles a Nivel 1 y 2 (RLS).
--   4. Permite a Nivel 3 (Admin de Asignaciones) escribir territorios,
--      asignaciones, tareas y programa (RLS de escritura a nivel <= 3).
-- ============================================================================

-- 1) NIVEL 4 en perfiles ------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_access_level_check;
alter table public.profiles add  constraint profiles_access_level_check check (access_level in (1,2,3,4));
alter table public.profiles alter column access_level set default 4;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, access_level)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          coalesce((new.raw_user_meta_data->>'access_level')::int, 4))
  on conflict (id) do nothing;
  return new;
end; $$;

-- 2) TABLA DE DATOS SENSIBLES -------------------------------------------------
create table if not exists public.publisher_private (
  id         bigint primary key references public.publishers(id) on delete cascade,
  ord        int default 0,
  data       jsonb not null default '{}'::jsonb,   -- { tel, email, dir, nacimiento, obs }
  updated_at timestamptz default now()
);
alter table public.publisher_private enable row level security;

drop policy if exists publisher_private_sel on public.publisher_private;
create policy publisher_private_sel on public.publisher_private for select using (public.current_level() <= 2);
drop policy if exists publisher_private_ins on public.publisher_private;
create policy publisher_private_ins on public.publisher_private for insert with check (public.current_level() <= 2);
drop policy if exists publisher_private_upd on public.publisher_private;
create policy publisher_private_upd on public.publisher_private for update using (public.current_level() <= 2);
drop policy if exists publisher_private_del on public.publisher_private;
create policy publisher_private_del on public.publisher_private for delete using (public.current_level() <= 2);

-- 3) MOVER los datos sensibles existentes fuera de publishers -----------------
insert into public.publisher_private (id, data)
select id, jsonb_strip_nulls(jsonb_build_object(
         'tel',        data->>'tel',
         'email',      data->>'email',
         'dir',        data->>'dir',
         'nacimiento', data->>'nacimiento',
         'obs',        data->>'obs'))
from public.publishers
on conflict (id) do update set data = excluded.data;

update public.publishers
set data = data - 'tel' - 'email' - 'dir' - 'nacimiento' - 'obs';

-- Quitar columnas sensibles de la tabla pública (si existían)
alter table public.publishers drop column if exists email;
alter table public.publishers drop column if exists phone;

-- 4) RLS de escritura para el Nivel 3 (operativo) ----------------------------
--    territorios, asignaciones, casas-no-predicar, tareas y overrides/config
--    pueden ser escritos por Nivel 1, 2 y 3.
do $$
declare t text;
begin
  foreach t in array array['territories','territory_assignments','do_not_call','tasks','app_state'] loop
    execute format('drop policy if exists %I on public.%I;', t||'_ins', t);
    execute format($f$create policy %I on public.%I for insert with check (public.current_level() <= 3);$f$, t||'_ins', t);
    execute format('drop policy if exists %I on public.%I;', t||'_upd', t);
    execute format($f$create policy %I on public.%I for update using (public.current_level() <= 3);$f$, t||'_upd', t);
    execute format('drop policy if exists %I on public.%I;', t||'_del', t);
    execute format($f$create policy %I on public.%I for delete using (public.current_level() <= 3);$f$, t||'_del', t);
  end loop;
end $$;

-- ============================================================================
-- FIN. Notas:
--   · Tras correr esto, vuelve a entrar a la app como Nivel 1: los datos
--     sensibles se leerán desde publisher_private y todo seguirá igual para ti.
--   · Un usuario Nivel 3 ya NO recibirá teléfono/dirección/correo/nacimiento
--     ni siquiera por API (RLS lo impide), y podrá gestionar territorios y
--     asignaciones.
--   · Recuerda asignar niveles a tus usuarios, p. ej.:
--       update public.profiles set access_level = 2 where email = 'anciano@...';
--       update public.profiles set access_level = 3 where email = 'siervo@...';
-- ============================================================================
