# Gestión de usuarios desde la app (Punto 2)

Permite crear usuarios y asignarles su nivel (1–4) desde **Configuración → Usuarios** en MS Planner, sin entrar a Supabase. Para que sea seguro, la creación de usuarios corre en una **Edge Function** (mini función de servidor) donde vive la llave de administrador — nunca en el navegador.

Tiempo: ~5 minutos. No necesitas instalar nada.

---

## 1. Desplegar la función `admin-users`

1. En tu proyecto de Supabase → menú lateral **Edge Functions**.
2. Pulsa **Deploy a new function** (o **Create a function**) → **Via editor** (editar en el navegador).
3. **Nombre EXACTO:** `admin-users` (con guion, en minúsculas).
4. Borra el código de ejemplo y **pega TODO** el contenido de [`supabase_edge_admin_users.ts`](supabase_edge_admin_users.ts).
5. Pulsa **Deploy**. Espera a que diga *Deployed* (~30 s).

> No hay que configurar secretos: la función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase inyecta automáticamente en las Edge Functions.

## 2. Probar desde la app

1. Abre MS Planner e inicia sesión con tu cuenta real (Nivel 1 o 2).
2. Menú lateral → **Usuarios**. Verás la lista de usuarios (al principio, solo tú).
3. **Nuevo usuario** → nombre, correo, nivel y una contraseña inicial → **Crear usuario**.
4. Comparte esos datos con la persona; ya puede iniciar sesión. Podrá cambiar su contraseña después.

## 3. ¿Qué puede hacer cada quién?

- **Nivel 1 (Super Administrador):** crea y gestiona usuarios de cualquier nivel (1–4).
- **Nivel 2 (Administrador de Congregación):** crea y gestiona usuarios de Nivel 2, 3 y 4 (no puede crear ni modificar un Nivel 1).
- **Nivel 3 y 4:** no ven la sección Usuarios.

Reglas de seguridad (validadas en el servidor, no solo en la interfaz):
- No puedes asignar un nivel superior al tuyo.
- No puedes modificar a un usuario de mayor nivel que el tuyo.
- No puedes desactivarte a ti mismo.

## 4. Acciones disponibles

- **Cambiar nivel:** el selector de cada fila actualiza el rol al instante.
- **Desactivar / Activar:** bloquea o restaura el acceso de un usuario (no lo borra).

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se pudo cargar la lista" | La función no está desplegada o el nombre no es `admin-users` | Revisa el paso 1; el nombre debe ser exacto |
| "No tienes permiso para gestionar usuarios" | Tu cuenta es Nivel 3 o 4 | Solo Nivel 1 y 2 gestionan usuarios |
| "Disponible con el backend real" | Entraste en modo demostración | Inicia sesión con tu cuenta real |
| Error 401 / sesión inválida | Token vencido | Cierra sesión y vuelve a entrar |
