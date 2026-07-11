-- ============================================================================
-- MS Planner — Migración: Storage para imágenes de territorio
-- ----------------------------------------------------------------------------
-- Para proyectos que YA corrieron supabase_schema.sql (y opcionalmente
-- supabase_migration_roles.sql). Ejecutar completo en:
-- Supabase → SQL Editor → New query → pegar → Run.
-- Es idempotente (se puede correr más de una vez sin romper nada).
--
-- Qué hace:
--   1. Crea el bucket público "territorios" en Storage.
--   2. Permite lectura pública (las fotos de territorio no son datos sensibles).
--   3. Permite subir/reemplazar/borrar solo a usuarios autenticados con
--      access_level <= 3 (los mismos que pueden gestionar territorios en la app,
--      capacidad `territory.manage`).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('territorios', 'territorios', true)
on conflict (id) do update set public = true;

drop policy if exists territorios_public_read on storage.objects;
create policy territorios_public_read on storage.objects
  for select using (bucket_id = 'territorios');

drop policy if exists territorios_write on storage.objects;
create policy territorios_write on storage.objects
  for insert with check (bucket_id = 'territorios' and public.current_level() <= 3);

drop policy if exists territorios_update on storage.objects;
create policy territorios_update on storage.objects
  for update using (bucket_id = 'territorios' and public.current_level() <= 3);

drop policy if exists territorios_delete on storage.objects;
create policy territorios_delete on storage.objects
  for delete using (bucket_id = 'territorios' and public.current_level() <= 3);

-- ============================================================================
-- FIN. Notas:
--   · Las imágenes ya guardadas como texto base64 (dentro de la columna jsonb
--     `data->>'img'` de `territories`) NO se migran automáticamente: seguirán
--     funcionando igual (el navegador las muestra igual que una URL), pero
--     pesan más en la base de datos. Basta con volver a subir la imagen desde
--     la app (Editar territorio → Reemplazar) para que quede en Storage.
--   · Tras correr esto, las imágenes NUEVAS que se suban desde la app irán al
--     bucket "territorios" en vez de guardarse como texto dentro de la fila.
-- ============================================================================
