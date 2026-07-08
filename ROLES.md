# MS Planner — Roles y Permisos

La plataforma tiene **4 niveles de acceso**. La interfaz **oculta** (no solo deshabilita) lo que cada rol no puede usar, y el backend (Supabase RLS) impide el acceso no autorizado aunque se llame directamente a la API.

| Nivel | Rol | Para quién |
|---|---|---|
| **1** | Super Administrador | Administrador general de toda la plataforma |
| **2** | Administrador de Congregación | Ancianos que administran su congregación |
| **3** | Administrador de Asignaciones | Siervos ministeriales / operativos (sin datos personales) |
| **4** | Publicador | Usuario estándar (solo su información) |

## Matriz de permisos

| Funcionalidad | 1 Super Admin | 2 Admin Congregación | 3 Admin Asignaciones | 4 Publicador |
|---|:--:|:--:|:--:|:--:|
| Configuración global / suscripciones | ✅ | ❌ | ❌ | ❌ |
| Administrar congregaciones | ✅ | ❌ | ❌ | ❌ |
| Administrar usuarios y roles | ✅ | ✅ | ❌ | ❌ |
| Ver información personal (tel/dirección/correo) | ✅ | ✅ | ❌ | Solo la propia |
| Administrar territorios | ✅ | ✅ | ✅ | Solo consultar los asignados |
| Administrar programa de reuniones | ✅ | ✅ | ✅ | ❌ |
| Crear asignaciones | ✅ | ✅ | ✅ | ❌ |
| Confirmar asignaciones | ✅ | ✅ | ✅ | Solo las propias |
| Ver dashboards | ✅ | ✅ | Operativo (limitado) | Personal |
| Descargar / exportar reportes | ✅ | ✅ | ❌ | ❌ |
| Reportar predicación | ✅ | ✅ | ✅ | ✅ |
| Editar perfil | ✅ | ✅ | ✅ | Solo el propio |

## Cómo se ve en la app por rol

- **Nivel 1 y 2** — menú completo: Dashboard, Programaciones, Asistencia, Base de datos, Territorios, Exhibidores, Informes, Actividad, Reportes, AI Insights, Configuración. (El Nivel 2 no ve Suscripción ni configuración global.)
- **Nivel 3** — solo lo operativo: **Dashboard operativo**, **Programaciones**, **Territorios**, **Exhibidores**, **Actividad**. No ve Base de datos, Asistencia, Informes, Reportes, AI Insights ni Configuración. **No recibe teléfonos ni direcciones** (protegido por la base de datos).
- **Nivel 4** — **Mi espacio** (perfil) + **Actividad** (notificaciones). Su experiencia completa (programa, aceptar/rechazar asignaciones, reportar predicación) está en desarrollo.

## Implementación técnica

- **Frontend:** motor `can(capacidad)` con una matriz de capacidades por nivel (`CAP_MIN`). El menú y las vistas se filtran (`VIEW_CAP`, `renderNav`), las acciones se bloquean (`requireCap`) y los datos sensibles se ocultan (`redact`).
- **Backend (Supabase):**
  - Los perfiles guardan `access_level` (1–4). Las políticas **RLS** usan `current_level()`.
  - **Datos sensibles separados:** teléfono, dirección, correo y nacimiento viven en la tabla `publisher_private`, cuya lectura está restringida a Nivel 1 y 2. El Nivel 3 nunca los recibe, **ni siquiera por API**.
  - **Escritura por rol:** territorios, asignaciones, tareas y programa → Nivel 1‑3; publicadores, grupos, informes, anuncios y configuración → Nivel 1‑2; configuración global y suscripciones → Nivel 1.
- **Escalable:** agregar un permiso nuevo = una entrada en `CAP_MIN` (y su política RLS si aplica), sin tocar la arquitectura.

## Asignar roles

En Supabase → **SQL Editor**:
```sql
update public.profiles set access_level = 1 where email = 'superadmin@...';   -- Super Administrador
update public.profiles set access_level = 2 where email = 'anciano@...';       -- Admin de Congregación
update public.profiles set access_level = 3 where email = 'siervo@...';        -- Admin de Asignaciones
update public.profiles set access_level = 4 where email = 'publicador@...';     -- Publicador (por defecto)
```
