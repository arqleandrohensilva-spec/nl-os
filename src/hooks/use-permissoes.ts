import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/use-user-role';

export const MODULOS: { key: string; nome: string; descricao: string }[] = [
  { key: 'dashboard', nome: 'Dashboard', descricao: 'Visualizar indicadores gerais do escritório.' },
  { key: 'clientes', nome: 'Clientes', descricao: 'Visualizar e editar fichas de clientes.' },
  { key: 'pipeline', nome: 'Pipeline comercial', descricao: 'Gerenciar leads e negociações em andamento.' },
  { key: 'projetos', nome: 'Projetos', descricao: 'Acompanhar etapas, documentos e entregas dos projetos.' },
  { key: 'horas', nome: 'Controle de horas', descricao: 'Lançar e consultar horas trabalhadas.' },
  { key: 'financeiro', nome: 'Financeiro', descricao: 'Acessar parcelas, custos e resultados financeiros.' },
  { key: 'propostas', nome: 'Propostas e calculadora', descricao: 'Criar propostas e calcular investimentos.' },
  { key: 'documentos', nome: 'Documentos e contratos', descricao: 'Gerar e consultar contratos e documentos.' },
  { key: 'marketing', nome: 'Marketing e satisfação', descricao: 'Conteúdo, pesquisas e depoimentos.' },
  { key: 'configuracoes', nome: 'Configurações do sistema', descricao: 'Alterar integrações e parâmetros do sistema.' },
  { key: 'admin', nome: 'Painel administrativo', descricao: 'Gerenciar usuários, perfis e permissões.' },
];

/**
 * Permissões efetivas do usuário logado: união das permissões dos perfis
 * vinculados. Administradores recebem acesso total.
 */
export const usePermissoes = () => {
  const { isAdmin, loading: loadingRole } = useUserRole();
  const [modulos, setModulos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        if (ativo) { setModulos([]); setLoading(false); }
        return;
      }

      const { data: vinculos } = await supabase
        .from('usuario_perfis')
        .select('perfil_id')
        .eq('user_id', userId);

      const ids = (vinculos || []).map((v) => v.perfil_id);
      if (!ids.length) {
        if (ativo) { setModulos([]); setLoading(false); }
        return;
      }

      const { data: perms } = await supabase
        .from('perfil_permissoes')
        .select('modulo, permitido')
        .in('perfil_id', ids)
        .eq('permitido', true);

      if (!ativo) return;
      setModulos([...new Set((perms || []).map((p) => p.modulo))]);
      setLoading(false);
    };

    carregar();
    return () => { ativo = false; };
  }, []);

  return {
    loading: loading || loadingRole,
    modulos: isAdmin ? MODULOS.map((m) => m.key) : modulos,
    pode: (modulo: string) => isAdmin || modulos.includes(modulo),
  };
};
