# Auditoría UX/UI y Frontend — MS Planner (Demo Administrador)

**Producto:** MS Planner · Administración de congregación (perfil Administrador/Anciano)
**Artefacto auditado:** `congregacion-admin-demo.html` (SPA de un solo archivo: HTML + CSS + JS vanilla, datos simulados)
**Rol de auditoría:** Product Designer Senior + Frontend Tech Lead
**Fecha:** 2026-07-03

> Cambio solicitado ya aplicado: la pestaña **"Inteligencia Artificial" → "AI Insights"** (menú lateral, breadcrumb y título de la vista). No quedan referencias al nombre anterior.

---

## 1. Resumen ejecutivo

MS Planner es un demo **notablemente sólido a nivel visual**: sistema de diseño coherente (paleta morada, tipografía Inter, tarjetas redondeadas, sombras suaves, microinteracciones), navegación por módulos clara y un catálogo de reportes oficiales (S-21, S-13, S-88, S-1, resumen de servicio de campo) generados como PDF/Word/Excel reales desde el navegador, sin backend. Como **prototipo de alta fidelidad para vender la visión del producto, está muy por encima del promedio.**

Sin embargo, para pasar de “demo impecable” a “producto SaaS de producción”, hay tres brechas estructurales:

1. **No hay persistencia ni estado real.** Todo se regenera en memoria; al recargar se pierde lo editado. Es la limitación #1 que impide usarlo de verdad.
2. **Accesibilidad y semántica deficientes.** Elementos interactivos son `div`/`span` con `onclick`, sin roles ARIA, sin foco gestionado en modales, sin navegación por teclado real, sin `aria-label` en botones de solo icono. Esto excluye a usuarios de lectores de pantalla y penaliza SEO/mantenibilidad.
3. **Arquitectura monolítica.** Un único archivo de ~230 KB con render por `innerHTML` de plantillas string. Excelente para un demo autocontenido, inviable para escalar/mantener en equipo.

La buena noticia: la **capa de diseño es reutilizable casi al 100%**. La inversión debe ir a la capa de datos (persistencia → backend), accesibilidad y modularización, no a rehacer la UI.

**Veredicto:** UI 9/10 · UX 7/10 · Usabilidad 7/10 · Accesibilidad 3/10 · Calidad técnica (para producción) 4/10.

---

## 2. Usabilidad

### 2.1 Puntos que podrían ser más intuitivos
- **Buscador global no funcional.** El input “Buscar publicadores, territorios, tareas…” solo lanza un toast. Un usuario nuevo lo probará y sentirá que “algo está roto”. Debe buscar de verdad (comando global tipo ⌘K con resultados agrupados y navegación con teclado).
- **Acciones “Enviar/Recordar/Exportar resumen” simuladas.** Devuelven toast sin efecto. En un demo se entiende, pero conviene marcar visualmente lo que es simulado (badge “demo”) o convertirlo en real.
- **La congregación (abajo-izquierda) abre Configuración**, pero no es evidente que sea un botón. Falta affordance (icono de engranaje, chevron, o tooltip “Configuración/Cambiar congregación”).

### 2.2 Procesos con demasiados clics
- **Descarga de reportes:** botón → modal selector → “Generar”. Correcto para reportes con parámetros (mes/año), pero para los que no requieren parámetros (Base de datos, Tarjetas) el paso intermedio sobra: deberían descargar en 1 clic.
- **Filtros que no persisten.** Al salir y volver a Base de datos o Informes, los filtros se reinician. Reaplicarlos es fricción repetida.
- **Editar un publicador** requiere: fila → menú (⋯) → Editar. El **doble clic en la fila** ya abre la ficha (bien), pero desde la ficha “Editar” cierra el modal y abre otro (parpadeo). Idealmente edición inline o un modal que cambie de modo ver→editar sin cerrarse.

### 2.3 Simplificar navegación
- Añadir **atajos de teclado** globales (ya existe ⌘K para foco de búsqueda; ampliar: `g d` dashboard, `g t` tareas, `n` nueva asignación, `?` ayuda).
- **Recordar estado**: sidebar colapsado, pestaña activa por módulo, filtros — en `localStorage`.
- **Breadcrumbs de 2 niveles** cuando se entra a submódulos (p. ej. Territorios › Ficha #018) para orientar y permitir volver.

### 2.4 Puntos de confusión para usuarios nuevos
- Sin **onboarding** ni estados vacíos con guía (“Aún no tienes tareas — crea la primera”).
- Muchos módulos con **datos ya llenos** y sin explicación de qué es simulado vs editable.
- El **año de servicio (sep–ago)** aparece en reportes pero no se explica en la UI general; un usuario podría confundirlo con el año calendario.

---

## 3. Experiencia de Usuario (UX)

- **Flujo de navegación:** claro y plano (sidebar → módulo → vista). La reorganización del Dashboard en 3 filas (indicadores → actividad → listas) es acertada y ejecutiva.
- **Jerarquía visual:** buena. Títulos, KPIs y secciones bien diferenciados. Oportunidad: unificar tamaños de “section-title” (hay variantes de 11–13 px y colores distintos entre módulos).
- **Organización de la información:** coherente por dominio. Reportes centralizados (buena decisión). Territorios con dashboard de ciclo + calendario + mapa GIS es un punto fuerte.
- **Accesibilidad (brecha grande):**
  - Elementos clicables no nativos (`div.nav-item`, `div.lst-item`, filas) sin `role`/`tabindex`/manejo de teclado.
  - Modales sin `role="dialog"`, `aria-modal`, foco atrapado ni retorno de foco al cerrar; solo algunos cierran con ESC.
  - Botones de solo icono sin `aria-label` (usan `data-tip`, que no lee el lector de pantalla).
  - Estados de color (Activo/Irregular) dependen solo de color → añadir icono/etiqueta para daltonismo.
  - Sin `prefers-reduced-motion`, sin `:focus-visible` global.
- **Consistencia:** alta en el design system. Inconsistencias menores: variación de botones de acción entre filas de reportes (uno vs dos botones), y toasts como respuesta a acciones muy distintas.
- **Productividad:** faltan acciones masivas (seleccionar varios publicadores → enviar recordatorio), duplicar/plantillas de asignaciones, y “deshacer” tras eliminar.

---

## 4. Interfaz de Usuario (UI)

- **Colores:** paleta morada moderna y bien aplicada; semántica de estado consistente. Añadir **modo oscuro** (ya hay variables CSS, sería directo) elevaría la percepción de producto 2026.
- **Tipografía:** Inter, buena jerarquía. Cuidar que en offline (sin Google Fonts) el fallback sea elegante (ya hay stack del sistema — bien).
- **Espaciado/alineación:** en general uniforme. Revisar densidad de algunas tablas (filas altas están bien) y el modal de ficha en móvil.
- **Iconografía:** estilo unificado (tipo Lucide) en SVG inline. Oportunidad técnica: convertir a sprite `<symbol>`/`<use>` para no repetir paths y reducir peso.
- **Componentes:**
  - *Botones*: sólidos; añadir estado `:focus-visible` con anillo y estado `loading`/`disabled` real para acciones asíncronas.
  - *Tablas*: solo Base de datos tiene orden + paginación; extender a Informes/Territorios. Añadir encabezado “sticky” consistente y densidad configurable.
  - *Formularios*: buenos (validación de email en vivo). Añadir mensajes de error accesibles (`aria-describedby`), máscaras (teléfono, fechas) y estados de guardado.
  - *Tarjetas*: excelentes. Mantener.
  - *Modales*: unificar tamaños y comportamiento (foco, ESC, scroll-lock del body). Hoy el body puede hacer scroll detrás del modal.
  - *Menús*: el menú contextual (⋯) y popovers están bien; falta navegación con flechas del teclado.

---

## 5. Optimización técnica

### 5.1 HTML/CSS redundante o mejorable
- **SVG repetidos** decenas de veces (mismo path por icono). Migrar a sprite reduce peso y facilita cambios.
- **`onclick` inline** en casi todos los elementos: mezcla comportamiento y marcado, imposibilita CSP estricta (`unsafe-inline`) y complica testing. Migrar a *event delegation* con `data-action`.
- **Render por `innerHTML`** de plantillas string: cómodo, pero (a) re-renderiza módulos completos (pierde foco/scroll), (b) es superficie de XSS si algún dato proviene de usuario/servidor. Sanitizar o migrar a framework con binding seguro.

### 5.2 Rendimiento
- Archivo único ~230 KB sin minificar; sin *code splitting*. Para web real: dividir por rutas, `defer`, minificar, cachear.
- Generadores de datos deterministas corren en carga; con 127 publicadores es trivial, pero el patrón de “regenerar todo en cada render” no escala a miles de registros → virtualizar tablas largas.
- Fuentes de Google en `<link>` bloqueante; usar `font-display: swap` (ya implícito) y precarga.

### 5.3 Organización del código y escalabilidad
- Monolito de ~2.200 líneas. Recomendado para producción:
  - Separar en **módulos** (data, componentes UI, vistas, generadores de PDF/Excel/Word, router).
  - Adoptar un framework ligero (**Vue/Svelte/React**) o Web Components para reutilización real.
  - **Capa de datos**: store central (Pinia/Zustand/Signals) + **persistencia** (localStorage para offline, o API + Postgres vía Supabase).
  - Tests: unitarios de los generadores de documentos (S-21/S-13/S-88/S-1) y de utilidades de fecha/año de servicio.
- **Reutilización**: ya hay helpers buenos (`buildZip`, `buildXlsx`, `buildMultiPagePDF`, `donut`, `areaChart`). Encapsularlos como librería interna documentada.

### 5.4 Buenas prácticas
- Añadir `lang`, `meta viewport` (ya está), landmarks (`<nav>`, `<main>`, `<header>` — parcialmente), y `aria-current` en el ítem de navegación activo.
- CSP y evitar `innerHTML` con datos externos.
- Versionado semántico del archivo y changelog (ya se lleva un historial de versiones informal).

---

## 6. Funcionalidades

### 6.1 Que aportarían valor
- **Persistencia real** (localStorage → backend). *La más importante.*
- **Búsqueda global funcional** (⌘K) con navegación a registros.
- **Modo oscuro** y **PWA instalable/offline**.
- **Acciones masivas** y **plantillas** (duplicar semana de programa, aplicar asignaciones recurrentes).
- **Registro de auditoría** (quién cambió qué) — clave en gestión sensible.
- **Notificaciones y recordatorios reales** (correo/push) con programación.

### 6.2 Procesos automatizables
- **Recordatorios de informes** el día de cierre (ya hay toggle en Configuración → hacerlo real).
- **Auto-asignación balanceada** de partes de reunión (ya existe botón “Auto-asignar” en VMC; conectarlo a la lógica de carga que ya calcula AI Insights).
- **Cálculo y envío automático** de S-1/S-88 al cierre de mes/año de servicio.

### 6.3 Información adicional útil
- Tendencias/comparativos (mes vs mes anterior) ya presentes en varios KPIs; extender a territorios (tiempo medio de cobertura) e informes (tasa histórica).
- En la ficha del publicador: historial de asistencia y “última participación”.

### 6.4 Candidatos a eliminar/simplificar
- **Exports XLSX redundantes** que compiten con formatos oficiales mejores (p. ej. el Excel “plano” de territorios frente al S-13). Mantener uno por caso de uso.
- Botón **“Enviar”** genérico en cada reporte (toast) — o hacerlo real o quitarlo hasta tener correo.

---

## 7. Priorización de recomendaciones

| # | Problema | Recomendación | Beneficio | Impacto | Esfuerzo |
|---|----------|---------------|-----------|:------:|:-------:|
| 1 | No hay persistencia; se pierde todo al recargar | Persistir estado (localStorage; luego backend Supabase) | Vuelve la app usable de verdad | **Alto** | Medio→Alto |
| 2 | Accesibilidad deficiente (roles, foco, teclado, ARIA) | Elementos nativos + roles/ARIA + foco en modales + `:focus-visible` | Inclusión, cumplimiento, calidad percibida | **Alto** | Medio |
| 3 | Buscador global no funciona | Command palette ⌘K con resultados reales | Navegación rápida, sensación de producto | **Alto** | Medio |
| 4 | Sin login ni roles (Admin/Anciano/Publicador) | Autenticación + permisos por perfil | Multiusuario real, seguridad | **Alto** | Alto |
| 5 | Datos sensibles sin control (Habeas Data CO) | Cifrado, control de acceso, auditoría | Cumplimiento legal, confianza | **Alto** | Alto |
| 6 | Filtros/estado no persisten entre vistas | Guardar filtros, pestaña activa, sidebar en `localStorage` | Menos fricción repetida | Medio | Bajo |
| 7 | `onclick` inline + render `innerHTML` | Event delegation `data-action` + sanitización | Mantenibilidad, seguridad (CSP/XSS) | Medio | Medio |
| 8 | Monolito de 1 archivo | Modularizar + framework + store | Escalabilidad, trabajo en equipo | Medio | Alto |
| 9 | Orden/paginación solo en Base de datos | Extender a Informes/Territorios | Consistencia, productividad | Medio | Bajo |
| 10 | Acciones simuladas sin señal (toasts) | Marcar “demo” o volverlas reales | Claridad, confianza | Medio | Bajo |
| 11 | Sin modo oscuro | Añadir tema oscuro con variables CSS ya existentes | Percepción moderna, confort | Medio | Bajo |
| 12 | Sin estados vacíos/onboarding | Empty states guiados + tour inicial | Menor curva de aprendizaje | Medio | Medio |
| 13 | Congregación (Config) sin affordance | Icono/tooltip de acceso a Configuración | Descubribilidad | Bajo | Bajo |
| 14 | SVG repetidos e inline | Sprite `<symbol>`/`<use>` | Menor peso, cambios centralizados | Bajo | Bajo |
| 15 | Scroll del body detrás de modales | `overflow:hidden` en body al abrir modal | Pulido UX | Bajo | Bajo |
| 16 | Estado solo por color (Activo/Irregular) | Añadir icono/etiqueta | Accesibilidad (daltonismo) | Bajo | Bajo |
| 17 | Sin acciones masivas | Selección múltiple + acciones batch | Productividad admin | Medio | Medio |
| 18 | Exports XLSX redundantes | Consolidar a un formato por caso | Menos confusión | Bajo | Bajo |
| 19 | Recordatorios/notificaciones simulados | Motor real (correo/push) + scheduler | Automatización de valor | Alto | Alto |
| 20 | Sin PWA/offline | Manifest + service worker | Uso en campo sin conexión | Medio | Medio |

---

## 8. Entregables

### 8.1 Las 10 mejoras más importantes (por prioridad)
1. **Persistencia de datos** (localStorage → backend). Sin esto, no es un producto.
2. **Accesibilidad base**: elementos nativos, roles ARIA, foco en modales, teclado, `:focus-visible`.
3. **Command palette (⌘K)** con búsqueda global real.
4. **Autenticación y roles** (Admin/Anciano/Publicador) con permisos.
5. **Cumplimiento y seguridad** de datos personales (Habeas Data): cifrado, acceso, auditoría.
6. **Persistir estado de UI** (filtros, pestañas, sidebar).
7. **Refactor técnico**: event delegation + sanitización + modularización progresiva.
8. **Consistencia de tablas** (orden + paginación en todas).
9. **Notificaciones/recordatorios reales** con programación.
10. **Modo oscuro** + PWA instalable/offline.

### 8.2 Quick Wins (bajo esfuerzo, alto/medio impacto)
- `aria-label` en botones de solo icono y `aria-current` en el nav activo.
- `overflow:hidden` en `body` al abrir modales; ESC + clic-fuera consistentes en todos.
- Persistir sidebar colapsado, pestaña activa y filtros en `localStorage`.
- Modo oscuro con las variables CSS existentes (`prefers-color-scheme` + toggle).
- Descargar en 1 clic los reportes sin parámetros; dejar el modal solo para los que sí requieren mes/año.
- Añadir icono/etiqueta a los badges de estado (no depender solo del color).
- Sprite de iconos `<symbol>`/`<use>`.
- Marcar como “demo” las acciones simuladas o desactivarlas.

### 8.3 Mediano plazo
- Modularizar en componentes + store central; introducir un framework ligero.
- Persistencia real vía backend (recomendado **Supabase**: Postgres + Auth + Storage + Realtime).
- Command palette y búsqueda global funcional.
- Acciones masivas, plantillas de programación y “deshacer” en eliminaciones.
- Orden/paginación/virtualización en todas las tablas largas.
- Estados vacíos guiados y onboarding.

### 8.4 Estratégicas (versión futura)
- **App multiusuario con roles** y el segundo perfil (**Publicador**) completo.
- **Motor de notificaciones** (correo/push) + programaciones automáticas de reportes.
- **PWA/offline** y, a futuro, apps móviles.
- **AI Insights** conectado a datos reales: detección de publicadores en riesgo, balanceo automático de asignaciones, predicción de cobertura de territorios.
- **Facturación** de la suscripción (USD 20/año) y panel de administración de circuito.
- **Cumplimiento legal** integral (Habeas Data / privacidad de datos religiosos sensibles).

---

## 9. Oportunidades adicionales no solicitadas
- **Impresión (`@media print`)**: los reportes se generan como PDF (bien), pero las vistas de la app no tienen estilos de impresión; útil para imprimir listados directamente.
- **Internacionalización (i18n)**: textos hardcodeados en español; extraer a diccionario facilita export a inglés/portugués (ya contemplado en Configuración → Idioma).
- **Manejo de errores**: hoy todo “funciona”; con backend habrá errores → diseñar estados de error/reintento y skeletons de carga.
- **Telemetría de uso** (privacy-first) para saber qué módulos se usan y priorizar.
- **Exportación de configuración/semilla** para respaldos.

---

### Nota de alcance
Este documento audita el **demo del perfil Administrador**. Al abordar la versión de producción, gran parte del **sistema de diseño y de la lógica de generación de documentos oficiales es reutilizable**; la inversión principal debe concentrarse en **datos (persistencia/backend), accesibilidad, seguridad y modularización**, no en rehacer la interfaz.
