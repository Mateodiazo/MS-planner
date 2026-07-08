# Conectar MS Planner con Supabase (backend real + login por roles)

Esta guía deja la app con **autenticación real y control de acceso por roles**. Tiempo estimado: ~10 minutos. No necesitas instalar nada.

> Mientras no completes estos pasos, la app funciona en **modo demostración**: al abrirla verás una pantalla de acceso donde eliges un rol (Nivel 1/2/3) para probar el sistema de permisos. Los datos siguen guardándose en el navegador.

---

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. **New project** → ponle nombre (p. ej. `ms-planner`), define una contraseña de base de datos y elige la región más cercana (South America / East US).
3. Espera ~2 minutos a que el proyecto termine de aprovisionarse.

## 2. Copiar las credenciales

En el proyecto: **Project Settings** (engranaje) → **API**. Copia dos valores:

- **Project URL** → algo como `https://abcdxyz.supabase.co`
- **anon public** key → una cadena larga que empieza por `eyJ...`

> ⚠️ Usa solo la **anon public** key. **Nunca** copies ni publiques la `service_role` key (tiene acceso total sin restricciones).

## 3. Crear las tablas y las políticas

1. En el menú lateral: **SQL Editor** → **New query**.
2. Abre el archivo [`supabase_schema.sql`](supabase_schema.sql) de este repo, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe decir *Success*. Esto crea la tabla de perfiles, el trigger que asigna un perfil a cada usuario nuevo, todas las tablas de datos y las políticas de seguridad (RLS) por rol.

## 4. Crear los usuarios y asignar roles

1. Menú lateral: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe correo y contraseña del administrador. **Marca "Auto Confirm User"** (así puede entrar sin verificar el correo).
3. Repite para cada persona que deba tener acceso.
4. Por defecto todos quedan en **Nivel 3** (Usuario Estándar). Para elevar a un administrador, ve a **SQL Editor** y ejecuta (cambia el correo):

   ```sql
   -- Nivel 1: Administrador Global (acceso total)
   update public.profiles set access_level = 1 where email = 'admin@tucongregacion.org';

   -- Nivel 2: Administrador de Datos
   update public.profiles set access_level = 2 where email = 'secretario@tucongregacion.org';
   ```

   Niveles: **1** = Administrador Global · **2** = Administrador de Datos · **3** = Usuario Estándar.

## 5. Pegar las credenciales en la app

1. Abre `MS Planner App.html` con un editor de texto.
2. Busca (cerca del final, dentro del `<script>`) el bloque **AUTENTICACIÓN + ROLES**:

   ```js
   const SUPABASE_URL='';        // ej: https://abcdxyz.supabase.co
   const SUPABASE_ANON_KEY='';   // anon public key (empieza por eyJ...)
   ```

3. Pega tus dos valores entre las comillas:

   ```js
   const SUPABASE_URL='https://abcdxyz.supabase.co';
   const SUPABASE_ANON_KEY='eyJhbGciOiJI...tu-anon-key-completa...';
   ```

4. Guarda el archivo y ábrelo en el navegador. Ahora la pantalla de acceso pedirá **correo y contraseña reales**.

## 6. Iniciar sesión

- Entra con el correo/contraseña que creaste en el paso 4.
- Verás en la esquina superior derecha tu nombre y tu **nivel de acceso**. La interfaz se adapta al rol:
  - **Nivel 1** — ve y edita todo, incluida Configuración, Suscripción y (a futuro) gestión de usuarios.
  - **Nivel 2** — gestiona datos (publicadores, territorios, programación, informes) pero no Suscripción ni ajustes globales.
  - **Nivel 3** — consulta e registro básico; no puede crear/eliminar ni entrar a Configuración.
- **Cerrar sesión** está en el menú de tu perfil (arriba a la derecha).

---

## Notas importantes

- **Login por correo/contraseña funciona abriendo el HTML directamente** (`file://`), sin necesidad de hospedarlo.
- Si más adelante quieres **acceso con Google o enlaces mágicos**, hay que **hospedar** la app (Netlify, Vercel o GitHub Pages) porque esos métodos requieren una URL de redirección. Avísame y lo configuramos.
- La **anon key es pública y segura** siempre que las políticas RLS estén activas (lo están, las crea el `schema.sql`). El acceso real a los datos lo decide Postgres según el `access_level` del usuario.
- **Estado actual:** esta primera iteración conecta **autenticación y roles** con Supabase. Los *datos* de los módulos siguen guardándose localmente (localStorage); la migración de cada módulo a las tablas de Postgres es el siguiente paso del roadmap.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Correo o contraseña incorrectos" | Usuario no confirmado o credenciales mal escritas | Verifica el usuario en Authentication → Users; marca *Auto Confirm* |
| Entra pero sale como Nivel 3 | No se elevó el rol | Ejecuta el `update ... set access_level` del paso 4 |
| La pantalla sigue mostrando "modo demostración" | `SUPABASE_URL`/`ANON_KEY` vacías o mal pegadas | Revisa el paso 5; la URL debe terminar en `.supabase.co` |
| Error de red al iniciar sesión | URL incorrecta o proyecto pausado | Revisa la Project URL; reactiva el proyecto en el dashboard |
