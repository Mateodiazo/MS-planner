# 📋 CONTEXTO — MS Planner + Fusión con Mapa de Territorios

> Handoff para continuar el proyecto (pegar/leer en un chat nuevo o desde otro equipo).
> Última actualización: 2026-07-20.

## VISIÓN GENERAL
Fusión de 2 apps en una plataforma: **MS Planner** (admin de congregación "Las Flores",
vanilla JS + Supabase) y la **app de mapas de David** (React+Vite+Leaflet, antes Socket.io).
Arquitectura híbrida: un VPS (AWS) con Docker+Caddy sirve ambos frontends estáticos; Supabase
maneja auth+DB+Realtime (reemplaza Socket.io). Todo en español (es-CO).

## REPOS Y RUTAS
- **MS Planner**: github.com/Mateodiazo/MS-planner (rama `main`). Local: `/Users/online-sales-group/Documents/Cloude/`
- **Mapa de David (original)**: github.com/DavidRai1012/app_territorios (público). Clonado en `Cloude/app_territorios/`.
- **Mapa reescrito**: ahora versionado dentro de este repo en **`mapa/`** (copia de `app_territorios/app_base` con el rewrite).
- En vivo HOY: **msplanner.org** en **Vercel** (auto-deploy al hacer push a `main`). GitHub Pages activo en paralelo.

## SUPABASE (en vivo)
- Project ref: **iibparqecemexsscgnay** (https://iibparqecemexsscgnay.supabase.co). anon key en el código (pública).
- 4 roles: 1 Super Admin · 2 Admin Congregación · 3 Admin Asignaciones · 4 Publicador. Datos sensibles en `publisher_private` (RLS ≤2). Edge Function `admin-users` desplegada.

## ✅ HECHO (todo pusheado y en vivo)
- **Fase 0 seguridad**: escapeHTML/XSS, timeout sbRest, MAX_LENGTHS, auto-logout 8h, flag DEMO_DATE.
- **Fase 1**: CSS → `css/`. **Fase 2**: JS → `js/`. **Fase b.1**: ES modules + puente window. **Fase b.2**: imports reales.
- **Fase 3 (COMPLETA)**: `js/app.js` externo; ~282 onclick → **event delegation**; sin eval; **CSP `script-src 'self'` ESTRICTA** vía `<meta>` (hash del anti-flash). HTML = shell de 60 líneas. Verificado en vivo.
- **Migración Publicador** (`supabase_migration_publicador.sql`): CORRIDA (tablas field_reports/assignments/assignment_responses/profiles.publisher_id).
- **PWA Publicador** (`publicador.html`): conectada a Supabase (login real, sesión, datos con fallback demo, escrituras). End-to-end real SIN probar (falta vincular cuenta N4).
- **Admin: selector de vínculo cuenta↔ficha** en Usuarios. REQUIERE redesplegar la Edge Function `admin-users` (`supabase_edge_admin_users.ts`, acción `set_publisher`).

## 🗺️ MAPA (rewrite HECHO — en `mapa/`)
Socket.io→Supabase. **BUILDEA OK** (validado en el VPS: `vite build` ✓ 268 módulos).
- `src/context/TerritoriesContext.jsx`: Supabase (auth por sesión sin modal de nombre; Realtime; acciones; **permisos granulares mapPermissions**: admin niveles 1-2=todo, delegados vía tabla `map_permissions`; log de actividad reimplementado cliente-side).
- `src/MapComponent.jsx`: consume el context (quitado socket propio); **ELIMINADOS el password `Sal8318` y los permisos por nombre `'Superintendente Nel'`**; modo lectura anónimos.
- `src/App.jsx`: StandaloneHeader + banner modo lectura. `main.jsx`: provider + postMessage tema.
- `vite.config.js` base `/mapas/`. `package.json` sin socket.io/express, con @supabase/supabase-js. `backend/` eliminado. `index.css` tokens+estilos. `.env.example` (crear `.env` real con VITE_SUPABASE_URL/KEY para buildear).
- Los 37 GeoJSON en `mapa/data/mapas/` (territorio_id, numero_territorio, limites, manzanas[{id,numero,puntos}]).

## 🖥️ VPS (AWS EC2)
- Ubuntu 26.04, 2 vCPU, 2 GB RAM, Docker+Node+git, swap 2GB.
- **IP: cambia al parar/arrancar (SIN IP elástica)** — pedir la actual cada vez. (Fue 18.221.52.208 → 3.138.190.65.)
- SSH: `ssh -i /Users/online-sales-group/Llaves/MSPlanner-Keys.pem ubuntu@<IP>` (chmod 400).
- Fuente del mapa en el VPS: `~/mapa-src/` (build en `~/mapa-src/dist/`).
- **Deploy EXISTENTE (de otra persona)** en `/srv/msplanner/` (root): estructura completa del spec (msplanner-app/mapas-app/shared + Caddyfile con headers+CSP + docker-compose). Contenedor `msplanner-web-1` corriendo. Su build del mapa NO es el rewrite (hash distinto). El deploy duplicado del asistente en `~/srv/` ya se eliminó.

## 🔴 BLOQUEADORES / PENDIENTES DEL USUARIO
1. **Puerto 80 CERRADO** en el Security Group AWS → nada accesible desde internet. Abrir HTTP 80 + HTTPS 443 (0.0.0.0/0).
2. **Decidir**: ¿`/srv/msplanner/` es tuyo/de David? ¿Meter el mapa reescrito ahí (reemplazar mapas-app) o dejarlo aparte?
3. **SQL del mapa NO corrido**: tablas territories_geojson/map_part_states/map_bag_positions/map_activity_log/map_permissions + Realtime + RLS (SQL en el prompt largo). Sin esto el mapa carga vacío.
4. **Migrar los 37 GeoJSON** a territories_geojson (script Node con service_role — el asistente NO tiene el service_role key).
5. **Redesplegar Edge Function** `admin-users`.
6. **Probar Publicador end-to-end**: `update profiles set publisher_id=<id> where email='<correo N4>';` + entrar a publicador.html.

## 🔜 TAREAS DEL ASISTENTE (cuando se desbloquee)
- MS Planner: iframe del mapa en `VIEWS.territorios` + `?redirect=/mapas/` tras login + postMessage(tema/sesión) al iframe.
- **Compartición de sesión**: MS Planner usa localStorage `msp_session` (formato propio); el mapa usa supabase-js `msp_map_session` → NO se comparten solas. Puentear (leer `msp_session` y `supabase.auth.setSession`, o postMessage).
- Desplegar el mapa en la estructura elegida + probar en IP de staging (NO tocar DNS de Vercel hasta estar ok).

## NOTAS
- CSP: el Caddyfile relaja script-src a 'unsafe-inline', pero el `<meta>` estricto de MS Planner gana para SU página; el mapa usa la CSP relajada (React/Vite la necesita).
- No hay Node/npm en el Mac local → los builds del mapa se hacen en el VPS.
- Memoria persistente del asistente: `ms-planner-roadmap.md`.
