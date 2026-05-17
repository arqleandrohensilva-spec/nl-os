import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Senhas não conferem');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha atualizada');
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        <h1 className="text-[56px] font-cormorant leading-tight text-graphite mb-1">NL OS</h1>
        <p className="text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-6">
          Redefinir Senha
        </p>
        <div className="w-8 h-[1px] bg-bronze/40 mb-10" />

        {!ready ? (
          <p className="text-[10px] uppercase tracking-widest text-muted">Validando link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                placeholder="NOVA SENHA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-beige focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <Input
              type={show ? 'text' : 'password'}
              placeholder="CONFIRMAR SENHA"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 border-beige focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-graphite hover:bg-bronze transition-colors duration-200 rounded-none text-[10px] uppercase tracking-widest mt-2"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
