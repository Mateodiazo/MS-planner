// ============================================================================
// MS Planner — Edge Function: "admin-users"
// Gestión segura de usuarios (listar, crear, cambiar rol, activar/desactivar).
// La service_role (llave de administrador) vive SOLO aquí, en el servidor.
//
// Desplegar (sin instalar nada):
//   Supabase → Edge Functions → "Deploy a new function" / "Create a function"
//   → nombre EXACTO: admin-users → pega TODO este archivo → Deploy.
//   (No hay que configurar secretos: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
//    ya están disponibles automáticamente dentro de la función.)
// Ver SETUP_USERS.md para el paso a paso.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) Autenticar al que llama y leer su nivel
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "No autorizado" }, 401);
    const { data: uData, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !uData?.user) return json({ error: "Sesión inválida" }, 401);
    const callerId = uData.user.id;
    const { data: caller } = await admin.from("profiles").select("access_level").eq("id", callerId).single();
    const callerLevel = caller?.access_level ?? 4;
    if (callerLevel > 2) return json({ error: "No tienes permiso para gestionar usuarios" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // 2) Acciones
    if (action === "list") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,email,full_name,access_level,created_at")
        .order("access_level", { ascending: true });
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const banned: Record<string, boolean> = {};
      (list?.users || []).forEach((u: any) => {
        banned[u.id] = !!(u.banned_until && new Date(u.banned_until) > new Date());
      });
      const users = (profiles || []).map((p: any) => ({ ...p, banned: banned[p.id] || false }));
      return json({ users });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const full_name = String(body.full_name || "").trim() || email.split("@")[0];
      const level = Number(body.access_level) || 4;
      if (!email || !password) return json({ error: "Correo y contraseña son obligatorios" }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      if (level < callerLevel) return json({ error: "No puedes crear un usuario de mayor nivel que el tuyo" }, 403);
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, access_level: level },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").upsert({ id: created.user!.id, email, full_name, access_level: level });
      return json({ ok: true, id: created.user!.id });
    }

    if (action === "set_level") {
      const id = String(body.id || "");
      const level = Number(body.access_level);
      if (!id || !(level >= 1 && level <= 4)) return json({ error: "Datos inválidos" }, 400);
      if (level < callerLevel) return json({ error: "No puedes asignar un nivel mayor que el tuyo" }, 403);
      const { data: target } = await admin.from("profiles").select("access_level").eq("id", id).single();
      if (target && target.access_level < callerLevel) return json({ error: "No puedes modificar a un usuario de mayor nivel" }, 403);
      await admin.from("profiles").update({ access_level: level }).eq("id", id);
      await admin.auth.admin.updateUserById(id, { user_metadata: { access_level: level } });
      return json({ ok: true });
    }

    if (action === "set_active") {
      const id = String(body.id || "");
      const active = !!body.active;
      if (!id) return json({ error: "Falta el usuario" }, 400);
      if (id === callerId) return json({ error: "No puedes desactivarte a ti mismo" }, 400);
      const { data: target } = await admin.from("profiles").select("access_level").eq("id", id).single();
      if (target && target.access_level < callerLevel) return json({ error: "No puedes modificar a un usuario de mayor nivel" }, 403);
      await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
