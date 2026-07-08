# MS Planner

**MS Planner** es un SaaS (demo funcional) para administrar una congregación — perfil **Administrador/Anciano**. Congregación de ejemplo: **Las Flores** (Suba, Bogotá, Colombia).

**🔗 App en vivo:** https://mateodiazo.github.io/MS-planner/ (requiere usuario; el acceso lo crea un administrador).

## 🚀 Cómo usarlo

No requiere instalación, servidor ni dependencias:

1. Descarga `MS Planner App.html`.
2. Ábrelo con doble clic en cualquier navegador moderno (Chrome, Edge, Safari, Firefox).

Todo funciona localmente: los datos de demostración se generan al cargar y **tus cambios se guardan en el navegador** (localStorage). Para volver al estado original: **Configuración › Información general › Restablecer datos demo**.

## ✨ Funcionalidades

- **Dashboard** con KPIs dinámicos, alertas y accesos rápidos.
- **Programaciones**: calendario de reuniones, programación automática a 3 meses (entre semana y fin de semana) con acordeones por mes/semana, reasignación de partes, discursos públicos (crear, editar, reemplazar orador, cambiar fecha).
- **Asistencia**: registro por reunión, comparativos mensual/semanal, tendencia por año de servicio (sep–ago).
- **Actividad**: centro unificado de notificaciones y tareas (filtros, prioridades, marcar leído/completar).
- **Base de datos (CRM)**: 127 publicadores, ficha completa, alta/edición/eliminación con confirmación y deshacer, acciones masivas, exportación XLSX.
- **Mapas y Territorios**: mapa GIS SVG, listado, ficha con imagen y Google Maps, asignaciones de predicación diaria (la confirmación la responde el hermano desde su app), casas donde no se predica.
- **Exhibidores**: agenda semanal por turnos de 2 h, asignación de responsables por celda.
- **Informes mensuales**: registro/edición de informes, recordatorios, KPIs en vivo.
- **Reportes oficiales**: S-21, S-13 (Word/PDF), S-88, S-1 y resumen de servicio de campo — generados 100 % client-side (sin librerías).
- **Configuración**: datos de la congregación, anuncios y eventos (CRUD), grupos, legal y seguridad, soporte, suscripción.
- **Extras**: búsqueda global (⌘K), modo oscuro, accesibilidad (ARIA, foco visible, badges con icono), es-CO en toda la UI.

## 🔐 Autenticación y roles (Supabase)

La app incluye **login con control de acceso por roles**, listo para conectar con un backend real de Supabase:

- **3 niveles:** Nivel 1 (Administrador Global), Nivel 2 (Administrador de Datos), Nivel 3 (Usuario Estándar). La interfaz se adapta al rol (oculta y bloquea acciones no permitidas).
- **Modo demostración** (sin configurar nada): al abrir la app eliges un rol y pruebas el sistema de permisos al instante.
- **Backend real:** sigue [`SETUP_SUPABASE.md`](SETUP_SUPABASE.md) para conectar tu proyecto Supabase (login por correo y contraseña, perfiles con nivel de acceso y seguridad a nivel de fila). El esquema completo está en [`supabase_schema.sql`](supabase_schema.sql).
- **Datos en Postgres:** con Supabase configurado, los datos se guardan en la base de datos (no solo en el navegador) y se sincronizan automáticamente entre dispositivos. Panel de control en **Configuración → Sincronización** (estado, enviar/recargar). Si la nube falla, la app sigue funcionando en modo local.

> El login por correo/contraseña funciona incluso abriendo el HTML directamente. Los métodos con redirección (Google, magic links) requieren hospedar la app.

## 🧱 Arquitectura

- **Un solo archivo HTML autocontenido** (~350 KB): HTML + CSS + JavaScript vanilla, sin frameworks ni build.
- Router propio (`go()` / `VIEWS` / `NAV`), render por templates.
- Datos simulados deterministas (PRNG con semilla) + capa de mutaciones persistida en `localStorage` (`persistAll`/`hydrateAll`), comportándose como una API simulada.
- Generación de documentos client-side: XLSX/DOCX (ZIP OOXML manual) y PDF vectorial (texto seleccionable).

## 📄 Documentación

- [`HANDOFF_MS_Planner.md`](HANDOFF_MS_Planner.md) — estado completo del proyecto, arquitectura, convenciones y flujo de validación.
- [`AUDITORIA_UX_UI_MS_Planner.md`](AUDITORIA_UX_UI_MS_Planner.md) — auditoría UX/UI/frontend.

## 🗺️ Roadmap

- Backend real (Supabase: Postgres + Auth + Storage + Realtime), login por roles y despliegue web.
- Demo del perfil **Publicador** (app del hermano: confirmar/rechazar asignaciones).
