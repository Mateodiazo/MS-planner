# MS Planner

**MS Planner** es un SaaS (demo funcional) para administrar una congregación — perfil **Administrador/Anciano**. Congregación de ejemplo: **Las Flores** (Suba, Bogotá, Colombia).

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
