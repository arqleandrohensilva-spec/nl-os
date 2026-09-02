import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/use-user-role';

/**
 * Envolve rotas que só podem ser acessadas por administradores.
 * Deve ser usado dentro de ProtectedRoute (usuário já autenticado).
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bronze/20 border-t-bronze rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-white/40">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
        <div className="max-w-md text-center space-y-5">
          <ShieldAlert className="w-10 h-10 text-bronze mx-auto" />
          <h1 className="text-2xl font-cormorant uppercase tracking-[0.2em] text-white">Acesso restrito</h1>
          <p className="text-[11px] uppercase tracking-widest text-white/40 leading-relaxed">
            Esta área é exclusiva para administradores do sistema. Solicite acesso ao responsável pelo NL OS.
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold"
          >
            Voltar ao dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
