import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: isAdminData, error: roleErr } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdminData) return json({ error: "Acesso negado. Apenas administradores." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const ids = data.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }, { data: vinculos }] = await Promise.all([
        admin.from("profiles").select("*").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("user_roles").select("user_id, role"),
        admin.from("usuario_perfis").select("user_id, perfil_id"),
      ]);
      return json({
        users: data.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          profile: profiles?.find((p) => p.id === u.id) ?? null,
          roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
          perfis: (vinculos ?? []).filter((v) => v.user_id === u.id).map((v) => v.perfil_id),
        })),
      });
    }

    if (action === "create") {
      const { email, password, nome, telefone, data_nascimento, perfis, role } = body;
      if (!email || !password || !nome) return json({ error: "Nome, e-mail e senha são obrigatórios." }, 400);
      if (String(password).length < 8) return json({ error: "A senha deve ter ao menos 8 caracteres." }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (error) return json({ error: error.message }, 400);
      const uid = created.user!.id;

      await admin.from("profiles").upsert({
        id: uid,
        nome,
        email,
        telefone: telefone || null,
        data_nascimento: data_nascimento || null,
      });
      if (Array.isArray(perfis) && perfis.length) {
        await admin.from("usuario_perfis").insert(perfis.map((p: string) => ({ user_id: uid, perfil_id: p })));
      }
      if (role) await admin.from("user_roles").insert({ user_id: uid, role });

      return json({ ok: true, id: uid });
    }

    if (action === "update") {
      const { id, nome, telefone, data_nascimento, ativo, password, perfis, role } = body;
      if (!id) return json({ error: "Usuário inválido." }, 400);

      if (password) {
        if (String(password).length < 8) return json({ error: "A senha deve ter ao menos 8 caracteres." }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) return json({ error: error.message }, 400);
      }
      await admin.from("profiles").upsert({
        id,
        nome: nome ?? "",
        telefone: telefone || null,
        data_nascimento: data_nascimento || null,
        ativo: ativo ?? true,
      });
      if (Array.isArray(perfis)) {
        await admin.from("usuario_perfis").delete().eq("user_id", id);
        if (perfis.length) {
          await admin.from("usuario_perfis").insert(perfis.map((p: string) => ({ user_id: id, perfil_id: p })));
        }
      }
      if (typeof role === "string") {
        await admin.from("user_roles").delete().eq("user_id", id);
        if (role) await admin.from("user_roles").insert({ user_id: id, role });
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "Usuário inválido." }, 400);
      if (id === caller.id) return json({ error: "Você não pode excluir o próprio usuário." }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
