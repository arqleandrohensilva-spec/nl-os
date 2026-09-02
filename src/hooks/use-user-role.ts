import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'gestor' | 'user';

/**
 * Lê os papéis do usuário autenticado a partir da tabela user_roles.
 * A validação real acontece no banco (RLS + função has_role) — aqui é
 * apenas a leitura para decidir o que exibir na interface.
 */
export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        if (ativo) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (!ativo) return;

      if (error) {
        console.error('Erro ao carregar permissões:', error);
        setRoles([]);
      } else {
        setRoles((data || []).map((r) => r.role as AppRole));
      }
      setLoading(false);
    };

    carregar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      carregar();
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    roles,
    loading,
    isAdmin: roles.includes('admin'),
    hasRole: (role: AppRole) => roles.includes(role),
  };
};
