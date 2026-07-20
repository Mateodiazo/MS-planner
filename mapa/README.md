# Control de Territorios Suba

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

Una aplicación web interactiva en tiempo real diseñada para coordinar, registrar y visualizar el avance de la predicación en zonas geográficas (territorios). Permite a múltiples usuarios marcar su progreso sobre un mapa cartográfico en tiempo real, generar reportes automáticos y administrar capas especiales de negocios.

## 🚀 Características Principales

*   **Sincronización en Tiempo Real:** Todos los usuarios conectados ven los cambios al instante gracias a WebSockets (`Socket.io`).
*   **Geolocalización:** Rastreo de ubicación del usuario en tiempo real sobre el mapa cartográfico.
*   **Capa de Negocios:** Funcionalidad exclusiva para superusuarios que permite separar las casas normales de los locales comerciales (negocios), permitiendo campañas específicas.
*   **Modo Solo Lectura:** Acceso público seguro para visualizar el mapa sin permisos de edición.
*   **Reportes Automatizados:** Generación y descarga directa en el navegador de reportes mensuales y anuales en formato `.docx` agrupados por publicador y fecha.
*   **Alto Rendimiento en Móviles:** Algoritmos de *Viewport Culling* (ocultación de geometría fuera de pantalla) y renderizado Canvas para mantener el sistema fluido incluso en teléfonos de gama baja.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** React.js, Vite, React-Leaflet (mapas), docxtemplater (generación DOCX).
*   **Backend:** Node.js, Express, Socket.io.
*   **Base de Datos:** Almacenamiento JSON local (ligero y sin dependencias externas).
*   **Infraestructura:** Docker Compose, Caddy (Reverse Proxy + SSL automático).

---

## 💻 Instalación y Desarrollo Local

### Prerrequisitos
- [Node.js](https://nodejs.org/es/) (v16 o superior)
- Git

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/DavidRai1012/app_territorios.git
   cd app_territorios
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor backend:**
   ```bash
   node server.cjs
   ```
   *(El servidor correrá en `http://localhost:3000` y creará la carpeta `data/` si no existe).*

4. **Iniciar el servidor frontend (Vite) en otra terminal:**
   ```bash
   npm run dev
   ```
   *(El frontend estará disponible generalmente en `http://localhost:5173`).*

---

## 📦 Despliegue en Producción (VPS)

El proyecto incluye una carpeta `para_servidor/` configurada para desplegarse fácilmente usando Docker y Caddy.

1. Construye los estáticos de React:
   ```bash
   npm run build
   ```
2. Copia la carpeta `dist/` y el archivo `server.cjs` a la carpeta `para_servidor/`:
   ```bash
   cp -r dist/ para_servidor/dist/
   cp server.cjs para_servidor/
   ```
3. En tu servidor VPS (habiendo configurado los DNS de tu dominio):
   ```bash
   cd para_servidor
   docker-compose up -d --build
   ```

---

## 📂 Estructura del Proyecto

*   `/src`: Código fuente del frontend (React). El archivo más importante es `MapComponent.jsx`.
*   `/server.cjs`: Código fuente del backend (Node.js/Socket.io).
*   `/data/mapas`: Archivos JSON con las coordenadas poligonales de cada territorio y manzana.
*   `/para_servidor`: Entorno preconfigurado para producción con Docker.
*   `DOCUMENTACION_INTERNA.md`: Guía de arquitectura y explicación del código para desarrolladores (¡Lectura obligatoria antes de modificar componentes core!).

---

## 🤝 Contribución

Si deseas aportar o modificar el código, por favor lee primero el archivo `DOCUMENTACION_INTERNA.md` ubicado en la raíz del proyecto para entender el flujo de estados y las reglas de renderizado optimizado del mapa.
