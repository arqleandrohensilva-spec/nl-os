
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text,
  telefone text,
  data_nascimento date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_select_auth" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_write_admin" ON public.perfis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER perfis_updated_at BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.perfil_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  permitido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (perfil_id, modulo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_permissoes TO authenticated;
GRANT ALL ON public.perfil_permissoes TO service_role;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil_permissoes_select_auth" ON public.perfil_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_permissoes_write_admin" ON public.perfil_permissoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER perfil_permissoes_updated_at BEFORE UPDATE ON public.perfil_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usuario_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, perfil_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_perfis TO authenticated;
GRANT ALL ON public.usuario_perfis TO service_role;
ALTER TABLE public.usuario_perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_perfis_select_self_or_admin" ON public.usuario_perfis FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "usuario_perfis_write_admin" ON public.usuario_perfis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.perfis (nome, descricao, sistema) VALUES
  ('Administrador', 'Acesso total ao sistema, incluindo painel administrativo e configurações.', true),
  ('Gestor', 'Acesso a clientes, pipeline, projetos, financeiro e propostas.', true),
  ('Colaborador', 'Acesso limitado a projetos e controle de horas.', true);

INSERT INTO public.perfil_permissoes (perfil_id, modulo, permitido)
SELECT p.id, m.modulo,
  CASE
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gestor' THEN m.modulo <> 'admin'
    ELSE m.modulo IN ('dashboard', 'projetos', 'horas')
  END
FROM public.perfis p
CROSS JOIN (VALUES ('dashboard'),('clientes'),('pipeline'),('projetos'),('horas'),('financeiro'),('propostas'),('documentos'),('marketing'),('configuracoes'),('admin')) AS m(modulo);
