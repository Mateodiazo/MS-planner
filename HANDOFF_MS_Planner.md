# MS Planner — Documento de traspaso (para continuar en otro chat)

> Pega este archivo (o su contenido) al inicio del nuevo chat. Resume todo el estado del proyecto, la arquitectura, las convenciones y cómo continuar.

---

## 1. Qué es el proyecto

- **Producto:** **MS Planner** — SaaS (demo) para administrar una congregación de Testigos de Jehová. Perfil **Administrador/Anciano**.
- **Congregación:** **Las Flores** (Suba, Bogotá, Colombia). Circuito CO‑12.
- **Usuario admin del demo:** **Paublo Díaz** (Anciano · Coordinador), avatar "PD".
- **Archivo único:** `/Users/online-sales-group/Documents/Cloude/congregacion-admin-demo.html`
  - HTML + CSS + JS **vanilla**, **autocontenido**, **datos simulados**, **sin backend/APIs**. Se abre con doble clic o `file://`.
  - ~230 KB, ~2.200 líneas. Todo el JS va en un único `<script>` al final del `<body>`.
- **Otros archivos del proyecto:**
  - `AUDITORIA_UX_UI_MS_Planner.md` — auditoría UX/UI/frontend ya entregada.
  - `HANDOFF_MS_Planner.md` — este documento.
- **Fecha simulada (constante global):** `TODAY = new Date(2026,5,29)` (29 jun 2026).
- **Año de servicio:** **septiembre → agosto** (NO calendario). `CURRENT_SY = 2026`.

## 2. Cómo abrir / entorno

- Abrir: `open "/Users/online-sales-group/Documents/Cloude/congregacion-admin-demo.html"` o pegar `file:///Users/online-sales-group/Documents/Cloude/congregacion-admin-demo.html` en el navegador (NO el link del chat).
- Entorno de la máquina: macOS (darwin). **Hay** `python3`, `qlmanage`, `sips`, `osascript`. **NO hay** `node`/`npm`, ni `poppler` (pdftoppm/pdftotext), ni `deno`/`bun`.
- El **preview server** del IDE y `python -m http.server` fallan por sandbox; para servir usar un `-c` de http.server (raro que se necesite). El clasificador de Bash a veces cae temporalmente ("claude-opus-4-8 is temporarily unavailable") → reintentar.

## 3. Arquitectura del front

- **Router:** función `go(id)` → setea `currentView`, `renderNav()`, breadcrumb, limpia `#content` y llama `VIEWS[id]()`.
- **`NAV`** = array de secciones/ítems del sidebar. **`TITLES`** = mapa id→título (breadcrumb).
- **`VIEWS`** = objeto con una función por vista que hace `document.getElementById('content').innerHTML = \`...template...\``.
- **Render** = plantillas string + `innerHTML` (re-render completo del módulo). `onclick=""` inline por todas partes.
- **Vistas:** `dashboard, programaciones, reuniones, asistencia, actividad, database, territorios, exhibidores, informes, reportes, ia (etiqueta "AI Insights"), config`. **`actividad`** unifica Notificaciones + Tareas (07 jul 2026). `VIEWS.tareas` y `VIEWS.notificaciones` son **alias de `VIEWS.actividad`** (compatibilidad de links viejos); `VIEWS.reuniones` sigue huérfana. NAV › Análisis: `informes, actividad, reportes, ia` (badge de `actividad` = pendientes totales, dinámico vía `activityPending()` en `renderNav`).
  - Nota: la vista de IA tiene **id interno `ia`** pero su **etiqueta/título es "AI Insights"** (renombrado recientemente; ya no queda "Inteligencia Artificial").
- **Config** (`VIEWS.config`) se abre al hacer clic en la congregación (abajo-izq del sidebar). Pestañas: general, reuniones, anuncios, eventos, informes (`inf`), grupos, circuitos, **legalseg (Legal y seguridad)**, sub(suscripción).
  - La pestaña `legalseg` tiene dos sub-pestañas (control segmentado `.seg`, estado global `legalTab` = 'legal'|'seguridad', función `setLegalTab(t)`): **Cumplimiento Legal** (Habeas Data, privacidad, tratamiento/consentimiento, datos religiosos sensibles, derechos ARCO, retención, cumplimiento normativo) y **Seguridad** (cifrado TLS/AES, RBAC, MFA, auditoría, backups, DR, monitoreo, buenas prácticas). Contenido informativo/estático (banner + grid de tarjetas con `.lst-ico` tintadas).

## 4. Sistema de diseño (no romperlo)

- Paleta **morada**: `--brand-500:#5B21B6`, `--brand-400:#8B5CF6`, `--brand-700:#312E81`; sidebar con degradado `--sidebar-grad`. Semánticos: green `#22C55E`, amber `#F59E0B`, red `#EF4444`, blue `#3B82F6`, cyan `#06b6d4`, violet, pink. Fondo `#F5F7FB`, tinta `#1E293B`/`#64748B`, borde `#E2E8F0`.
- Tipografía **Inter** (Google Fonts + fallback del sistema).
- Clases clave: `.card`, `.kpi`, `.btn`(.primary/.sm/.ghost/.danger), `.badge`(green/amber/red/blue/violet/cyan/gray/pink), `.field`, `.select`, `.input`, `.form-grid/.form-row`, `.tabs/.tab`, `.modal/.modal-overlay`, `.set-ico` (icono discreto 30px/svg15), `.dash-grid/.dash-rowlabel`, `.bigcal` (calendario grande), `.exgrid`, etc.
- Iconos: `svg('nombre')` devuelve SVG inline (estilo Lucide). Íconos definidos en el objeto `I`.
- Helpers UI: `pageHead(t,s,acciones)`, `roleBadge`, `estadoBadge`, `prioBadge`, `confBadge`, `avatarHTML(name)`, `fmtFecha`, `toast(msg)`, `openModalCustom({icon,tint,title,sub,body,footer,size})`, `closeModal()`.

## 5. Datos simulados (deterministas)

- **PRNG/seed:** `hashStr(s)` (FNV), `seededPick(arr,seed)`, `seededBool(seed,p)`, `rng()`, `pick`, `rint`, `chance`. Todo determinista → mismos datos en cada carga.
- **`DB`** (127 publicadores REALES): construido desde `REAL_GROUPS` (6 grupos con `n`, `sup`, `aux`, `m[]` de nombres) y `MALE_NAMES` (Set de nombres masculinos). Cada persona: `{id,nombre,apellidos,fullName,sex,grupoIdx,superintendente,auxiliar,tel,email,nacimiento,dir,localidad,grupo,role,privilegio,privilegios[],accessRole,estado,bautismo,nombramiento,obs}`.
  - **`role`** = título ministerial **primario** (mayor rango de `privilegios`), sigue usándose en toda la app (roleBadge, `males`, S-21, asignaciones, filtros). **`privilegios`** = array multi-select de títulos ministeriales (`PRIVILEGIOS`, sin "Inactivo"). **`accessRole`** = nivel de acceso (`ACCESS_ROLES`: 'Nivel 1 – Administrador Global' / 'Nivel 2 – Administrador de Datos' / 'Nivel 3 – Usuario Estándar'). `privilegio` = duplicado legacy de `role`.
  - Títulos ministeriales (`ROLES`/`PRIVILEGIOS`): Anciano, Siervo Ministerial, Precursor Regular, Precursor Auxiliar, Publicador, Publicador no bautizado. `estado`: Activo/Irregular/Inactivo. Helpers: `primaryPriv(list)` (mayor rango vía `PRIV_RANK`), `defaultAccessRole(list)` (Anciano→Nivel 2; resto→Nivel 3; Nivel 1 solo manual).
  - `males` = DB hombres activos; asignaciones (discursos, territorios, exhibidores, etc.) usan SOLO hombres.
- **`GRUPOS`** = ['Grupo 1'..'Grupo 6']. `REAL_GROUPS[i]` tiene `.n/.sup/.aux/.m`.
- **`TERR`** (37 territorios): `{num,localidad,barrio,resp,estado,asign,comp,cobertura,hist[],cuadras,viviendas,img,maps}`. Barrios de Bogotá (`BARRIOS_BOG`). `hist[]` = `{resp,asign,comp,obs}`. `terrForDate(date)` → asignación por día (calendario territorios). `img` = data-URL de imagen de referencia (o null). `maps` = enlace de Google Maps (o null).
- **`NO_PREDICA`** (14): incluye `terr` (n° territorio).
- **`EXHIB`**: 2 exhibidores `EXHIB_NAMES=['El Solar','Lombardía']`, turnos dom‑dom 7–19 cada 2h, `exhibTurn(ex,date,slotIdx)`.
- **Reuniones:** solo **martes 7:00 p.m.** (mid) y **domingo 8:00 a.m.** (we). `mkParts(date,type)` genera partes; `meetingMeta(type)`, `upcomingMeetings(n)`, `unconfirmedCount`.
- **`TASKS`** (estados solo **Pendiente/Completada**), **`INFORMES`**, **`NOTIFS`**, **`ANUNCIOS`**.
- **Asistencia:** `ATT_LABELS` (Ene..Dic), `ATT_MID[]`, `ATT_WE[]` (por mes calendario), `ATT_CAP=150`. `attMonth(fy,mi,type)` para S‑88 (año servicio). `fsRow(p,y,m)` para actividad mensual por publicador (usado por resumen de campo y S‑1).
  - **Vista `VIEWS.asistencia` (reformada 05 jul 2026):** gráficos ARRIBA (bajo KPIs). Orden **año de servicio** (`FY_ORDER=[8,9,10,11,0..7]`, `FY_LABELS` sep→ago) con selector `asistFY` (default `CURRENT_SY`). `attVal(fy,ci,type)` = valor por año fiscal (base `ATT_MID/ATT_WE` + delta seeded por fy≠actual). Comparativo con **colores distintos**: entre semana `#5B21B6`, fin de semana `#06b6d4` (+leyenda). **Registro persistente:** `ATT_REG[type+iso]={count,zoom,obs}`; `attMeeting` lo consulta primero. `saveAttReg(iso,type)` valida total≥1 y re-renderiza. KPIs **clicables** (`role=button`, `.kpi-chev`): `openAttAvg('mid'|'we')`, `openRegistradas()`, `openPendientes()`. `attScanList()` (90 días) → `{reg,pend}` (solo fechas ≤ TODAY); alimenta contadores y las listas. `openRegAsist()` abre la pendiente más reciente.
- **`STATS`** = agregados (totales por rol, territorios, informes, etc.).

## 6. Generación de documentos (INFRAESTRUCTURA CLAVE — reutilizar)

Toda la generación es **client-side, sin librerías**. Patrones ya probados:

### XLSX / DOCX (ZIP OOXML)
- `crc32`, `s2b(str)` (UTF‑8), `buildZip(files)` (STORE, sin compresión) → `Uint8Array`.
- `buildXlsx(rows, sheetName)` → xlsx. `rows` = array de arrays.
- **DOCX** (`exportTerrDocx`): se arma `word/document.xml` a mano + `[Content_Types].xml` + `_rels/.rels`, y `buildZip`. Editable en Word nativamente. Encabezados de tabla repetibles con `<w:trPr><w:tblHeader/></w:trPr>`.
- `downloadBlob(name, data, mime)`.

### PDF (dibujo vectorial, texto seleccionable)
- `buildMultiPagePDF(pages, W, H)` → **devuelve `Uint8Array`** (bytes latin1). Fuentes **WinAnsiEncoding**: F1 Helvetica (obj 3), F2 Helvetica‑Bold (obj 4). Páginas en obj `5+2i`, contenido en `6+2i`, `Resources /Font << /F1 3 0 R /F2 4 0 R >>`. `pages` = array de strings de contenido.
- Patrón de dibujo (top‑origin, convertir `y_pdf = H - yTop`):
  - Texto: `BT /F2 sz Tf r g b rg x (H-y) Td (texto) Tj ET`
  - Líneas: `x1 y1 m x2 y2 l S` (color trazo `r g b RG`, ancho `w w`).
  - Rects: `x y w h re f` (relleno) / `re S` (trazo).
  - `esc` para strings: `String(s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&')` → **quita chars >0xFF** (conserva acentos latin‑1, que WinAnsi renderiza bien) y escapa `()\`.
  - Centrado aprox: `x = cx - texto.length*sz*0.5/2`.
- **Tarjeta S‑21 (`cardS21Content(p)` → `downloadCard`/`downloadAllCards`)**: desde 05 jul 2026 es **PDF FINAL NO editable** (se dibujan los valores como texto plano y las casillas como marca de verificación, sin AcroForm). Se genera vía `buildMultiPagePDF([...],595,842)`. **Ya NO quedan PDFs con AcroForm en el proyecto** (todos planos). El único documento editable es el **Word** S‑13 (`exportTerrDocx`), que no es PDF. *(Histórico: antes era AcroForm con `/FT /Tx` + `/AP` propias y `/FT /Btn`; se eliminó por el requisito de PDFs no editables.)*

### ⚠️ GOTCHAS CRÍTICOS (aprendidos a las malas)
1. **Byte NUL invisible = pantalla en blanco.** Si una edición mete un `\x00` en el `<script>` (p. ej. un espacio que se guardó como NUL dentro de una regex), **Chrome aborta TODO el script** y la app queda en blanco (JavaScriptCore lo tolera, por eso engaña). **Siempre validar** con: `LC_ALL=C grep -aP -c "[\x00-\x08\x0B-\x1F\x7F]" archivo` → debe dar **0**.
2. **Offsets del PDF:** `buildMultiPagePDF` calcula offsets con `pdf.length` (chars) y luego convierte a bytes latin1 (`Uint8Array.from(pdf, c=>c.charCodeAt(0)&0xff)`). Solo es correcto si **todos los chars ≤ 0xFF** (por eso `esc` quita >0xFF y se usa WinAnsi). No romper esto.
3. **Réplicas en Python para verificar:** al replicar la lógica PDF en Python, respetar EXACTO el layout de objetos de `buildMultiPagePDF` (fuentes en obj **3 y 4**; páginas en 5+2i). Si se numera mal (fuente y página colisionan en obj 5), **el texto no se renderiza** (bug de la réplica, no de la app).

## 7. Reportes ya implementados

En módulo **Reportes → "Reportes descargables"** (cada fila: Vista previa · Enviar · Descargar). Funciones:
- **Base de datos** → `repBaseDatos()` (xlsx).
- **Informes mensuales** (resumen 6 meses) → `repInformes6m()` (xlsx).
- **Tarjetas** (todas en un PDF) → `downloadAllCards()` — usa `cardS21Content` (mismo diseño S‑21 que la tarjeta individual `downloadCard`, PDF final no editable).
- **Reporte de Territorios** → botones **Word** (`exportTerrDocx`, S‑13 editable) y **PDF** (`exportTerrPdf`, S‑13 plano). También `exportTerrXlsx`. En **Mapas y Territorios** el botón "Descargar reporte" usa `exportTerrDocx`.
- **Asistencia** → `openAsistYearSelect()` → `exportAsistPdf(rightFY)` — **S‑88**, PDF editable (texto), selector año de servicio (actual/anterior), dos años lado a lado, meses sep→ago.
- **Resumen de servicio de campo** → `openFieldSummarySelect()` → `exportFieldSummaryPdf(y,m,gi)` — por mes y grupo, PDF editable, con colores (PUB/PNB gris, Activo verde/Irregular naranja/Inactivo rojo), casillas participó/aux, multipágina.
- **Servicio de campo y asistencia (S‑1)** → `openS1Select()` → `exportS1Pdf(y,m)` — **PDF FINAL NO editable** (plano, sin AcroForm), recuadros de indicadores por mes.
- `repPreview(type)` maneja las vistas previas (casos: bd, inf6, cards, terr, asist, pred, campo, s1).

Formatos oficiales replicados a partir de PDFs de referencia en `~/Downloads`: **S‑21** (tarjeta publicador), **S‑13** (registro asignación territorio), **S‑88** (registro asistencia), **Resumen servicio de campo**, **S‑1**.

## 8. Flujo de validación (usar SIEMPRE tras editar el HTML)

1. Control chars = 0: `LC_ALL=C grep -aP -c "[\x00-\x08\x0B-\x1F\x7F]" congregacion-admin-demo.html`
2. Balance JS: extraer el `<script>` **principal** (ahora hay 2: el anti-flash del `<head>` + el principal → tomar el más largo) y verificar `{} () []` y backticks pares.
3. Compilación: `osascript -l JavaScript -e '... new Function(fs) ...'` (JavaScriptCore) para detectar errores de sintaxis.
4. (Init sin errores) opcional: correr el script con DOM simulado en JavaScriptCore.
5. Referencias `onclick`/vistas: verificar que toda función usada exista y que cada `go('x')` tenga `VIEWS.x`.
6. Documentos: generar el PDF/docx replicando la lógica en Python y **renderizar con `qlmanage -t -s 1700 -o /tmp archivo.pdf`** → leer el PNG para comparar con el oficial.

## 9. Historial de cambios relevante (V1 → hoy)

- V1‑V3: construcción del demo (módulos, calendarios, CRM, mapas, exhibidores, reportes básicos), rediseño premium morado, logo **MS Planner**, datos Bogotá.
- V4: datos reales **LAS FLORES** (127 publicadores), Dashboard rediseñado, Config congregación, módulos **Asistencia** e **IA**, Comunicación (modal), formulario Nuevo publicador, menú (⋯), export xlsx territorios.
- V5: territorios (calendario 7 días, ficha dashboard, **mapa GIS SVG de Las Flores**), Dashboard en 3 filas, Discursos (⋯), tarjeta con campos S‑21, Config Informes estilo M365, Exhibidores iconos unificados, Reportes simplificado.
- V6/6.1: **tarjeta S‑21 como PDF AcroForm editable** (fiel al oficial, blanco y negro, casillas reales).
- Reportes oficiales: **S‑13** (Word/PDF, 4 bloques por página + continuación), **S‑88** (año de servicio), **Resumen servicio de campo**, **S‑1** (PDF no editable).
- Modal **Ver contacto** rediseñado (iconos discretos, tarjetas, KPIs).
- **Rename "Inteligencia Artificial" → "AI Insights"** (menú, breadcrumb, título).
- Auditoría UX/UI entregada (`AUDITORIA_UX_UI_MS_Planner.md`).
- **Config → nueva pestaña "Legal y seguridad" (`legalseg`)** (05 jul 2026): dos sub-pestañas (Cumplimiento Legal / Seguridad) con control segmentado `.seg`, banner + tarjetas informativas. Iconos nuevos en `I`: `scale`, `lock`. CSS: soporte de icono en `.seg button`. Ubicada antes de Suscripción.
- **Affordance del botón de congregación** (05 jul 2026, quick win auditoría #1): `.cong-switch` ahora muestra un engranaje (`.cong-cog`, gira 35° en hover) + tooltip "Configuración de la congregación". Accesibilidad: `role="button"`, `tabindex="0"`, activación con Enter/Espacio y anillo `:focus-visible`. El engranaje se oculta con el sidebar colapsado.
- **Editar publicador sin parpadeo** (05 jul 2026, quick win): la ficha (`openFicha`) cambia ver→editar→ver **dentro del mismo modal** mediante `swapModalContent({...})` (reemplaza head/body/foot sin quitar el overlay). Refactor: `fichaViewConfig(id)` y `fichaEditConfig(id,fromView)` devuelven la config; `openFicha`/`openEditContact` son wrappers; `fichaToEdit(id)`/`editFichaCancel(id)` hacen el swap. `saveContact(id,fromView)` persiste todos los campos (nombre, apellidos, tel, email, dir, fechas, obs, grupo/idx+sup/aux, rol, privilegio, estado) y vuelve a la vista (si `fromView`) o cierra (menú ⋯). Inputs con ids `ec_*`.
- **Lote grande #2 (organización/funcionalidad)** (06 jul 2026):
  - **Desglose semanal** en Asistencia: toggle **Mensual/Semanal** (`asistVista`) + selector de mes (`asistWeekMonth`); `asistWeeks(fy,ci)` genera semanas (Sem 1..n) del mes en el año fiscal; comparativo cambia meses↔semanas.
  - **Programaciones**: quitado botón "Registrar asistencia"; **acordeón** en Reunión entre semana / fin de semana (`meetingCardsHTML` → `.acc-card/.acc-head/.acc-body[hidden]`, `toggleAcc`, colapsado por defecto).
  - **NAV**: pestaña **Reuniones** eliminada del menú; **Tareas** e **Informes Mensuales** movidos a la sección **Análisis**. (`VIEWS.reuniones` queda huérfana.)
  - **Territorios**: columna **Responsable** eliminada del listado (Vista de mapa); la asignación se maneja en Asignaciones. Botón **"Accesos rápidos"** del topbar eliminado.
  - **Asignaciones**: nueva columna **Confirmación** (`conf`: conf/pend/rech) con badge (`confBadgeAsign`) + `<select>` que actualiza vía `setAsignConf`.
  - **Config › Grupos**: **Nuevo grupo** y **Configurar** funcionales (`openGrupoModal`/`saveGrupo`): nombre, superintendente/auxiliar (searchable), gestor de integrantes (agregar/quitar con `window.__grpSel`), persiste en `REAL_GROUPS`/`GRUPOS` y reasigna `grupoIdx` de los miembros.
  - **Discursos Públicos** ⋯: quitado "Ver historial"; funcionales `verOradorContacto`, `openReemplazarOrador`, `openCambiarFechaDiscurso`.
  - **Perfil › Configuración**: nueva pantalla de usuario `openUserConfig`/`saveUserConfig` (`USER_PREFS` en localStorage): notificaciones, idioma, zona horaria, formato fecha/hora, modo oscuro (→`toggleTheme`), densidad, 2FA, cambio de contraseña con validación.
- **Lote grande UX/navegación** (06 jul 2026):
  - **Programaciones**: pestaña "Vida y Ministerio" → **"Reunión entre semana"** + nueva **"Reunión fin de semana"**; ambas usan `meetingCardsHTML(type)` (extraído de Reuniones, tabla Parte/Responsable/Estado/Acción). `renderVMC` quedó sin uso. Categoría de asignación y textos de calendario renombrados.
  - **Asistencia**: "Registrar asistencia" ahora abre `openRegAsist` → **selector de reunión programada** (`scheduledMeetings()`, solo martes/domingo, ±90/30 días) → `raContinue` → `openAttReg`.
  - **Territorios**: eliminado botón "Asignar territorio"; pestañas "Listado" y "Calendario" retiradas → **listado integrado en "Vista de mapa"**; nueva pestaña **"Asignaciones"** (`renderTerrAsign`, CRUD `TERR_ASIGN`={id,date,encargadoId,territorios[],obs}; `openTerrAsignModal`/`saveTerrAsign`/`delTerrAsign` con undo; filtros mes/encargado; multi-territorio por día con chips; default `terrTab='mapa'`).
  - **Searchable Select** (`searchSelect(id,options,selected,opts)` + `sselToggle/sselFilter/sselPick/sselValue`, CSS `.ssel*`, cierre por clic-fuera): aplicado a dropdowns de publicadores (te_resp, ta_enc, asignación, discurso). **Ojo:** `.ssel-pop[hidden]{display:none}` es obligatorio (el `display:flex` anula `hidden`).
  - **Eliminaciones**: botón "Historial" en Exhibidores e Informes; columna "Asistencia" en Reportes→Actividad por grupos.
  - **Notificaciones**: "Preferencias" → `openNotifPrefs`/`saveNotifPrefs` (store `NOTIF_PREFS`: activar, tipos, recordatorios, canal; persistido en localStorage).
  - **Config**: tab "Reuniones" fusionado en **Información general** (secciones con `.form-section-title`); tab **Circuitos** eliminado; **Eventos** fusionado en **Anuncios** (renombrado desde "Tablero de anuncios"). Tabs actuales: general, anuncios, inf, grupos, legalseg, sub, soporte. Guard en `renderConfig` redirige tabs obsoletos a general.
  - **Menú usuario**: correo → **compumat2009@hotmail.com**; "Mi perfil" → `openMiPerfil` (modal); "Configuración" → `go('config')`; "Cambiar congregación" → **"Cambiar idioma"** (`openIdioma`/`saveIdioma`, `APP_LANG` en localStorage `msp_lang`).
- **Asistencia · mejoras** (05 jul 2026): (1) gráficos movidos ARRIBA (bajo KPIs). (2) Comparativo entre semana/fin de semana con **colores distintos** (`#5B21B6`/`#06b6d4`) + leyenda. (3) **Tendencia anual por año de servicio** (sep→ago, `FY_ORDER`/`FY_LABELS`) con selector `asistFY`. (4) Botón **Registrar asistencia funcional**: `openRegAsist`→`openAttReg`→`saveAttReg` (valida total≥1, persiste en `ATT_REG`, re-render de KPIs/gráficos/calendario, toast éxito/error). (5) **KPIs interactivos** (`openAttAvg`/`openRegistradas`/`openPendientes`); "Pendientes por registrar" abre lista de reuniones pasadas sin registrar (fecha/tipo/nombre/estado/acción Registrar), solo `date≤TODAY`, y al registrar desaparece y baja el contador (`attScanList`). Helpers: `attVal`, `attScanList`, `ATT_REG`. CSS: `.kpi-chev`.
- **Mapas y Territorios · mejoras** (05 jul 2026): (1) **Columna Responsable editable** en la tabla (`renderTerrTable`): `<select>` inline por fila (`.terr-resp-sel`, lista `males`) → `setTerrResp(num,id)` asigna/quita al vuelo + toast; celda con `stopPropagation` para no abrir la ficha. (2) **Imagen del territorio**: `TERR[].img` (data-URL). Helpers `terrImgFieldHTML(img,wrapId)` (dropzone `.terr-drop` o preview con Reemplazar/Quitar), `terrImgPick` (FileReader, valida JPG/PNG/WEBP), `terrImgRemove`; se muestra en la ficha (`openTerrHist`). (3) **Ubicación Google Maps**: `TERR[].maps`; `isValidMaps`/`validateMapsUrl` (acepta google.*/maps, maps.app.goo.gl, goo.gl/maps); botón "Abrir en Google Maps" (`openTerrMaps`) en la ficha, oculto si no hay enlace. Nuevo modal **`openTerrEdit(num)`** (Responsable/Estado/Maps/Imagen, persiste vía `saveTerrEdit`) accesible desde la ficha, y **`openTerrCreate()`** (reemplaza `openModal('territory')`; `MODALS.territory` quedó sin uso). Estado de imagen en var global `terrEditImg`.
- **Modelo de roles y privilegios en Editar Contacto** (05 jul 2026): en la ficha de edición (`fichaEditConfig`), el campo **"Privilegio"** pasó a **multi-select de chips** `.chip-sel` (`PRIVILEGIOS`, sin "Inactivo") → `p.privilegios[]` (helpers `togglePrivChip`/`selectedPrivs`/`syncAccessRole`); y **"Rol"** pasó a **"Nivel de acceso (rol)"** con 3 niveles (`ACCESS_ROLES`) → `p.accessRole`. `saveContact` deriva `p.role=primaryPriv(privilegios)` (mantiene compatibilidad app-wide) y `p.privilegio=p.role`. Auto-asignación: al cambiar privilegios se recalcula el nivel (`defaultAccessRole`) salvo que esté en Nivel 1 (manual). DB init siembra `privilegios/accessRole`. La vista (`fichaViewConfig`) muestra "Privilegios" (badges) y "Nivel de acceso". `openPrivilegio`/`applyPriv` y el filtro de Base de datos alineados al array. CSS: `.chip-sel`.
- **Lote consistencia/soporte** (05 jul 2026):
  - **PDFs 100% no editables**: `downloadCard` (S‑21) se aplanó → nuevo `cardS21Content(p)` dibuja valores como texto y casillas como marca (sin AcroForm), vía `buildMultiPagePDF`. Los demás export*Pdf ya eran planos. Etiquetas/comentarios "PDF editable" → "PDF final". (El Word S‑13 sigue editable por ser DOCX, no PDF.)
  - **Reportes › Tarjetas** (`downloadAllCards`) reutiliza `cardS21Content` → mismo diseño S‑21 que la tarjeta individual de Base de datos (una consistencia, un solo diseño).
  - **Informes Mensuales**: encabezados ordenables (flecha) ya presentes desde el lote de tablas (`renderInfTable`/`sortHeader`) para Publicador, Grupo, Estado, Horas, Estudios, Tipo. ✔
  - **Badges del sidebar unificados**: se quitó `badgeMuted:true` de Tareas e Informes → ahora blancos como Programaciones/Notificaciones (`.nav-badge`).
  - **Nueva pestaña Config › Soporte** (`configTab==='soporte'`): formulario (nombre*, correo*, teléfono, tipo, prioridad, asunto*, descripción*, adjuntar archivo) con validación de obligatorios, máscara de teléfono y `saveWithFeedback`. `enviarSoporte(btn)` valida y abre `mailto:mateo.diaz@claria-co.com` con asunto+cuerpo. Tarjeta de contacto (Mateo Diaz, CMO). CSS: `.select.invalid/.textarea.invalid`.
- **Formularios: máscara, validación accesible y estados de guardado** (05 jul 2026, auditoría Formularios): `maskPhone(el)` formatea a móvil colombiano `### ### ####` (máx 10 dígitos, `inputmode="numeric"`). `validateEmail(el)` generalizado (busca el hint por `aria-describedby`/`id+_hint` vía `fieldHintEl`), añade clases `.input.valid/.invalid` y `aria-invalid`, y el hint usa `aria-live="polite"` con clases `.field-hint.ok/.err`. `saveWithFeedback(btn,fn)` pone el botón en estado cargando (`.btn.loading`+`.spinner`+`aria-busy`, ~700 ms) y restaura si sigue en el DOM. Cableado: teléfonos (ficha edición `ec_tel` + móvil/casa del modal nuevo publicador), correos (con `aria-describedby`), y botones Guardar de ficha edición, modal genérico (`openModal`) y Config. CSS nuevo: `.input.invalid`, `.field-hint.err`, `.btn.loading`, `.spinner`, `@keyframes spin`.
- **Orden + paginación en Informes y Territorios** (05 jul 2026, auditoría Tablas): se replicó el patrón de Base de datos (`dbState`/`filteredDB`/`renderDbTable`). Helpers genéricos nuevos: `pagerButtons(pages,cur,goFn)` (antes `pageButtons`, ahora wrapper) y `sortHeader(state,onclickFn,col,label,align)`. **Informes** → `infState`+`infFiltered()`+`renderInfTable()`+`infSortBy/infGo`; el `<tbody>` va en `#infTableWrap`; el filtro segmentado resetea `infState.page`. **Territorios (lista)** → `terrState`+`terrFiltered()`+`renderTerrTable()` (ahora **sin argumento**, lee `terrState.q`)+`terrSortBy/terrGo`; el buscador escribe en `terrState.q`. Badges Entregado/Pendiente de Informes también con icono (daltonismo). pageSize=10 en ambos.
- **Acciones masivas en Base de datos** (05 jul 2026, auditoría Productividad): selección múltiple en la tabla. `dbState.sel` = `Set` de ids. Columna de checkbox por fila (`.row-chk`) + "seleccionar todo" en el header (`#dbSelAll`, con estado `indeterminate`) que opera sobre **todo el conjunto filtrado** (no solo la página). Barra `.bulk-bar` (aparece con `sel.size>0`): "N seleccionados" + **Enviar recordatorio** (`bulkRemind` → toast + limpia), **Exportar selección** (`bulkExport`), **Quitar selección** (`clearSel`). Filas seleccionadas resaltadas (`tr.row-sel`). Funciones: `toggleSel(id,on)`, `toggleSelAll(on)`, `clearSel`, `bulkRemind`, `bulkExport`. El botón "Limpiar" filtros también resetea `sel`.
- **Unificar section-titles** (05 jul 2026, quick win auditoría): 3 títulos de sección inline (ficha de territorio: Información general / Casas donde no se predica / Historial de asignaciones) migrados a la clase compartida `.form-section-title`. Ahora todos los títulos de sección de formularios/modales pasan por una sola clase (11.5px, brand-500, uppercase). (Los `<h3 style="font-size:14px">` de las tarjetas compactas de Config→Informes se dejaron a propósito.)
- **Deshacer tras eliminar** (05 jul 2026, quick win auditoría): nuevo helper `toastAction(msg,label,onAction,opts)` (toast con botón de acción, ~6 s, botón `.toast-action`, se puede pasar `{icon,cls,duration}`). `applyDelete(id)` ahora ofrece **Deshacer**: guarda la persona y su índice, y al pulsar restaura con `DB.splice(i,0,p)` + re-render. CSS `.toast.undo svg{amber}` y `.toast-action`.
- **Accesibilidad / daltonismo** (05 jul 2026, quick win): `estadoBadge` y `confBadge` ahora llevan **icono además de color** (Activo ✓, Irregular/Vencido ⚠, Inactivo ⏸, Pendiente/Por confirmar 🕐, En progreso ↻) — CSS `.badge svg{12px}`. **Scroll-lock del body** con modal abierto (`body.modal-lock{overflow:hidden}`, se añade/quita en `openModalCustom`/`closeModal`). **`aria-current="page"`** en el ítem de nav activo (`renderNav`). Anillo **`:focus-visible`** global para `.btn/.icon-btn/.pg/.seg button/.tab`. (`<html lang="es">` y landmarks `<aside>/<header>/<nav>` ya existían.)
- **Modo oscuro** (05 jul 2026, quick win): scope `[data-theme="dark"]` en el `<html>` que redefine los tokens (`--bg/--surface*/--ink*/*-50/*-700/--sh-*`); overrides puntuales para `.header`, `.toast`, scrollbar y flecha del `.select`. Toggle en el topbar (`#themeToggle`, iconos `moon`/`sun`) vía `toggleTheme()`/`updateThemeToggle()`. Persiste en `localStorage('msp_theme')` y respeta `prefers-color-scheme`; script anti-flash en `<head>` aplica el tema antes de pintar. **Nota:** hay 2 `<script>` ahora (el temprano del head + el principal) → al validar balance/sintaxis, tomar el script **más largo**. Quedan blancos hardcodeados en el mapa GIS de territorios y la tarjeta S-21 (intencional/impresión).

- **Lote "Programaciones 3 meses · Asignaciones read-only · Actividad unificada"** (07 jul 2026):
  - **Programaciones** (Reunión entre semana / fin de semana): `meetingCardsHTML(type)` reescrito para generar **automáticamente los próximos 3 meses** (`meetingsNextMonths(type,3)` recorre desde `TODAY` por día de semana martes/domingo). Salida **agrupada por mes** (encabezado con `monthName` + `.tag` de nº de semanas) y **por semana** (una `.acc-card` acordeón por reunión, título "Semana N · fecha", subtítulo con `meta.title · fecha larga · hora`, colapsada por defecto). Card extraída a `meetingAccCard(dt,type,weekNo,meta)`; mismo diseño/tabla Parte/Responsable/Estado/Acción y `toggleAcc`. `renderReu` (vista huérfana) sigue usando `meetingCardsHTML`.
  - **Mapas y Territorios › Asignaciones**: la columna **Confirmación** es ahora **solo lectura** (requisito: el estado lo actualiza el hermano desde su app). Se quitó el `<select>` de `setAsignConf`; la celda muestra solo `confBadgeAsign(a.conf)` (Pendiente/Confirmado/Rechazado) + subtítulo "vía app del hermano". Banner informativo morado al inicio del card explicando el flujo automático. `setAsignConf` quedó **sin uso** (no se borró). El seeding de `conf` en `TERR_ASIGN` no cambió.
  - **Actividad (unifica Notificaciones + Tareas)**: nueva `VIEWS.actividad` (reemplaza `VIEWS.notificaciones`). KPIs (pendientes totales / notifs sin leer / tareas por completar), **filtro segmentado** `.seg` Todas/Notificaciones/Tareas (`actFilter`, `setActFilter`), y **bandeja** ordenada (pendientes primero → prioridad desc → fecha desc). Helpers: `activityPending()`, `actItems()` (funde `NOTIFS`+`TASKS` en items `{kind,idx,title,desc,ico,tint,date,pending,prio}`), `actRelTime(d)` (Hace/En X). Acciones por ítem: `markNotifRead(i)`, `completeActTask(id)`, `markAllActivity()` → `afterActChange()` re-renderiza vista + `renderNav` + toast. **Datos:** `NOTIFS[].date` (Date absoluta derivada de `mins`) y `TASKS[].creadaD/limiteD` (Date) añadidos para poder ordenar. Popover de campana → "Ver todas" ahora `go('actividad')`. **Badge del sidebar** = total pendientes, dinámico.
  - *Validación:* control chars=0, balance {}()[]/backticks pares, `new Function` OK y **23 aserciones funcionales en JavaScriptCore** (DOM stub) PASS. Nota: `qlmanage` NO ejecuta el JS de arranque en este sandbox (sin red para Google Fonts) → el PNG del original y el de cualquier vista inyectada dan **MD5 idéntico** (solo el shell estático); no sirve para verificar contenido dinámico aquí, usar el harness de JavaScriptCore.

- **APP FUNCIONAL (mock backend, 07 jul 2026)** — el demo dejó de ser maqueta; todo botón/form/tabla actúa de verdad sobre los datos y **persiste en localStorage** (`msp_data_v1`):
  - **Persistencia**: `persistAll()`/`hydrateAll()` al final del script (serializan DB, TASKS, NOTIFS, TERR (resp→respId), TERR_ASIGN+taSeq, NO_PREDICA, ANUNCIOS, EVENTS, REAL_GROUPS, INFORMES (pub→pubId), ATT_REG y los stores de overrides). Hydrate **mergea sobre los objetos base preservando identidad** (importante: `males/elders/pubsActive` son snapshots; `refreshDerived()` los reconstruye in-place tras mutar DB). Botón **"Restablecer datos demo"** en Config › Información general (`resetDemoData()`, borra la clave y recarga).
  - **Override stores** (declarados antes de `mkParts`): `MEET_OVR` (clave `iso+type+'|'+role` → {personId|null,confirmed}; `mkParts` lo aplica), `DISC_OVR` (iso domingo → {oradorId,bosq,cancion,tema,cong}; `discFor(dt)` resuelve), `EXHIB_OVR` (`ex|iso|slot` → 'empty'|[id,id]; `exhibTurn` lo aplica), `CONG_CFG` (Config general + plan).
  - **STATS dinámicos**: `let STATS` + `refreshStats()` (go() lo llama); `INF_ACTUAL_()/INF_PREV_()` funciones; badges de NAV via `navBadge(id)` (programaciones/informes/actividad) en cada `renderNav`.
  - **Helpers nuevos**: `notify(type,msg)` (unshift NOTIFS + renderNav + persist; alimenta Actividad y campana), `confirmAction(opts,cb)`/`__confirmRun` (modal de confirmación genérico antes de eliminar), `MODAL_SAVES`/`MODAL_INITS` en `openModal` (dispatch a guardadores reales).
  - **CRUD reales**: `savePublisher` (alta con validación, entra a DB+males+INFORMES), `exportDbFiltered` (xlsx del filtro actual), `saveTaskModal`/`openTaskDetail`/`openTaskEdit`/`saveTaskEdit`/`reopenTask`/`deleteTask`, `openReassignPart`/`saveReassignPart` (partes de reunión, también desde openMeeting), `saveAssignment`+`asgUpdateParts` (modal Nueva asignación con partes dependientes de la reunión), discursos (`saveDiscurso`/`saveReemplazarOrador`/`saveCambiarFechaDiscurso`, valida domingo), `saveTerrCreate`, `openAsignTerr(num)`/`saveAsignTerr` (reasigna responsable + hist), `saveNoPredica`/`delNoPredica`, `openExhibTurn`/`saveExhibTurn`/`vaciarExhibTurn` (clic en celda de la grilla), `openRegistrarInforme`/`saveRegistrarInforme` (entregar/editar informe, recalcula KPIs), `remindInforme`/`remindAllPending`, `openAnuncioModal`/`saveAnuncio`/`delAnuncio`, `openEventoModal`/`saveEvento`/`delEvento` (store `EVENTS`), `saveCongConfig`, `openSubGestion`, `sendComm` (notificación real), `openSendReport`/`sendReportMail` (Reportes › Enviar), búsqueda global real (`renderGlobalSearch`/`gsGo`, dropdown `#gsPop` con publicadores/territorios/tareas/vistas), campana marca leídas al clic.
  - **Limpieza**: eliminados huérfanos `renderVMC`/`setVmcMonth`/`personSel`/`durSel`, `VIEWS.reuniones`/`setReuTab`/`renderReu`/`reuTab`, `VIEWS.tareas` legado/`taskCard`, `MODALS.exhib`. **Cero `onclick` solo-toast.**
  - **Validación**: harness JavaScriptCore con DOM+localStorage simulados → **28/28 PASS** (boot, round-trip de persistencia, overrides, CRUD por módulo, todas las vistas renderizan). Chequeos estáticos: todo handler `onclick/onchange/oninput` existe; todo `go('x')` tiene `VIEWS.x`.

## 10. Pendientes / próximos pasos posibles

- **Demo del perfil Publicador** (segundo demo, aún no iniciado).
- ~~Hacer la app funcional Nivel 1 (localStorage)~~ ✅ (07 jul 2026). **Nivel 2 pendiente** = backend real (recomendado **Supabase**: Postgres+Auth+Storage+Realtime), login por roles, despliegue web.
- **Repo GitHub**: https://github.com/Mateodiazo/MS-planner (solicitado 07 jul 2026).
- **Quick wins de la auditoría** (bajo esfuerzo): ~~modo oscuro~~ ✅, ~~affordance botón congregación~~ ✅, ~~editar sin parpadeo~~ ✅, ~~`aria-current`~~ ✅, ~~scroll-lock del body con modal~~ ✅, ~~badges de estado con icono~~ ✅ (todo 05 jul 2026). **Pendientes:** persistir sidebar/pestañas/filtros, descargar en 1 clic los reportes sin parámetros, sprite de iconos (`<symbol>`/`<use>`).
- **Accesibilidad** (impacto alto): elementos nativos + roles ARIA + foco en modales + teclado.
- Buscador global (⌘K) real; hoy solo hace toast.

## 11. Reglas de trabajo con este proyecto

- **No romper el sistema de diseño** ni la arquitectura (NAV/VIEWS/go).
- Ediciones = `Edit` puntuales sobre el HTML; tras CADA cambio, **validar** (sección 8), especialmente **control chars = 0**.
- Para reportes nuevos: analizar el PDF oficial (`qlmanage` → PNG), replicar con los helpers existentes (`buildMultiPagePDF`/`buildXlsx`/`buildZip`), y **verificar renderizando en Python + qlmanage** antes de dar por hecho.
- Congregación = "Las Flores"; NO reintroducir nombres ficticios; asignaciones solo a hombres.
- Español (es‑CO) en toda la UI y documentos.

---

### Prompt sugerido para arrancar el nuevo chat
> "Continúo el proyecto MS Planner. El estado completo está en `/Users/online-sales-group/Documents/Cloude/HANDOFF_MS_Planner.md` y el app es `/Users/online-sales-group/Documents/Cloude/congregacion-admin-demo.html`. Lee el handoff antes de tocar nada y respeta el flujo de validación (control chars = 0, balance, qlmanage). Quiero [tu tarea aquí]."
