# Documentación Interna: Control de Territorios Suba

Este documento está diseñado para ayudarte a entender la estructura, la lógica y el flujo de datos de la aplicación "Control de Territorios". Lee este documento antes de realizar cambios estructurales profundos.

## 1. Arquitectura General

La aplicación sigue una arquitectura cliente-servidor en tiempo real:
- **Frontend (Cliente):** React.js + Vite + React-Leaflet. Se encarga exclusivamente de la interfaz de usuario, renderizar el mapa de forma optimizada y emitir acciones del usuario.
- **Backend (Servidor):** Node.js + Express + Socket.io. Se encarga de recibir las acciones de los usuarios, mantener el estado global de los territorios y distribuirlo en tiempo real a todos los clientes conectados.
- **Base de Datos:** Almacenamiento local basado en archivos JSON ubicados en la carpeta `data/`.

---

## 2. Estructura de Archivos (Frontend)

El código fuente principal del cliente está en `src/`.

### `src/MapComponent.jsx`
Este es el corazón del frontend. Es un archivo grande que contiene varios sub-componentes. Se recomienda leerlo en este orden:

1. **Sub-componentes Modales (`PasswordModal`, `NameModal`, `DocxModal`):**
   - Son pantallas flotantes sencillas para autenticar, registrar el nombre del publicador y generar el reporte DOCX.
   - **Nota:** `PasswordModal` incluye un botón de "Ver mapa" que activa el modo de `Solo Lectura`, bloqueando funciones de edición.

2. **Componentes Auxiliares del Mapa (`ZoomTracker`, `MapBoundsFitter`, `UserLocation`):**
   - `ZoomTracker`: Monitorea qué tan cerca está el mapa y qué área exacta se está viendo (`mapBounds`). Esto es CRÍTICO para el rendimiento, ya que permite ocultar los elementos que están fuera de la pantalla (Viewport Culling).
   - `MapBoundsFitter`: Ajusta la cámara inicial para que quepan todos los territorios.
   - `UserLocation`: Usa el GPS del navegador para mostrar la ubicación actual del usuario.

3. **Componente Principal (`MapComponent`):**
   - **Estados (State):** Mantiene en memoria `partStates` (estado de cada cara de la manzana), `activityLog`, variables de modo lectura, etc.
   - **Sockets (`useEffect`):** Al montar el componente, se suscribe a `initial_state`, `part_updated`, `face_type_updated`, etc. Cuando el servidor envía un evento, React actualiza los estados y repinta el mapa.
   - **Renderizado de Territorios y Manzanas:** Itera sobre `territories`. Por optimización matemática, solo dibuja (`<Polygon>`, `<Polyline>`, `<Marker>`) los territorios y manzanas que entran físicamente en la pantalla.
   - **Lógica de Capa de Negocios:** Si `businessLayerActive` es `true`, las manzanas normales se vuelven invisibles y solo se destacan en azul las caras configuradas como "negocios".

### Descarga del DOCX (`generateDocx`)
Ubicada dentro de `MapComponent.jsx`, esta función descarga `plantilla.docx`, agrupa las manzanas completadas por mes y publicador (eliminando nombres duplicados exactos), y utiliza `docxtemplater` para inyectar los datos en la plantilla y devolver un archivo descargable.

---

## 3. Estructura de Archivos (Backend)

### `server.cjs`
El servidor es muy liviano. Su flujo de lectura es:

1. **Carga de Datos Iniciales (`loadPartStates`, `loadTerritories`, `loadActivityLog`):**
   Funciones sincronas que leen los JSON desde la carpeta `./data`. `partStates.json` guarda un diccionario gigante de estados.

2. **Conexión de Sockets (`io.on('connection')`):**
   - **`initial_state`:** Envía a los recién conectados toda la base de datos al instante.
   - **`update_part`:** Cuando un usuario toca una cara (rojo/verde), el servidor lo anota, lo guarda en el disco duro e inmediatamente emite (`io.emit`) a los demás. Además, revisa si al hacer este movimiento la manzana se completó por completo, en cuyo caso añade el registro de actividad.
   - **`update_face_type`:** Para la capa de negocios. Define si una cara es de negocio (azul).
   - **`clear_all`:** Evento protegido para el Superintendente Nel. Borra el progreso (verde/rojo) pero mantiene las memorias asociadas a la capa de negocios (`type_*`) y posiciones de maletines (`bag_pos_*`).

---

## 4. Estructura de la Base de Datos (`data/`)

- `data/mapas/territorio_X.json`: Contienen la geometría pura (latitud y longitud) de los territorios y sus manzanas.
- `data/partStates.json`: Es la "memoria" del sistema. Su estructura es clave/valor (Key-Value):
  - `"1_2_p3": "completed"` -> (Territorio 1, Manzana 2, Cara 3, está hecha).
  - `"type_1_2_p3": "business"` -> (Esa cara es un negocio, pintarla azul si falta, verde si se hizo).
  - `"bag_pos_1": "Arriba"` -> (El icono grande del territorio 1 se renderiza en la parte superior).
- `data/activityLog.json`: Arreglo histórico con los nombres de publicadores, fechas, y tipo de acción (manzana completada, limpiado global, etc).

---

## 5. Optimizaciones Críticas a Tener en Cuenta

Si modificas el frontend, ten mucho cuidado con no romper estas dos optimizaciones, de lo contrario la aplicación se congelará en teléfonos móviles viejos:
1. **Viewport Culling (Línea ~500 de `MapComponent`):** El código revisa con la función `intersects()` si el rectángulo de la manzana choca con el rectángulo de la pantalla. Si no choca, devuelve `null` y no lo dibuja en el DOM.
2. **`preferCanvas={true}`:** En el componente `<MapContainer>`. Esto obliga a Leaflet a dibujar los polígonos usando la API Canvas de HTML5 en lugar de crear nodos SVG en el DOM. Mantiene el DOM libre y la RAM ligera.

---

## 6. Flujo de Despliegue a Producción

La carpeta `para_servidor/` existe para facilitar la subida a un VPS (como DigitalOcean/AWS).
1. `npm run build` compila el frontend en `dist/`.
2. Esa carpeta compilada se mueve a `para_servidor/dist`.
3. El archivo `server.cjs` se copia a `para_servidor/`.
4. En el servidor real de Linux, solo hace falta correr `docker-compose up -d --build` para levantar Caddy (HTTPS + Servidor estático) junto con Node.js en los puertos adecuados.
