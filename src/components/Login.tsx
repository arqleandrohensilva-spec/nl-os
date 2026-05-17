import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLogin }: { onLogin: (user: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const toEmail = (u: string) => (u.includes('@') ? u : `${u}@nlarquitetos.com.br`);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: toEmail(username),
        password,
      });
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Usuário ou senha incorretos' : error.message);
      }
    } catch {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(toEmail(username), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('E-mail de recuperação enviado');
        setMode('login');
      }
    } catch {
      toast.error('Erro ao enviar e-mail');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        <img 
          src="https://krzuroijejfozljhchok.supabase.co/storage/v1/object/public/assets/logo.png" 
          alt="NL Arquitetos" 
          className="w-48 mb-2"
        />
        <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mb-6">
          Sistema Operacional · NL Arquitetos
        </p>

        <div className="w-8 h-[1px] bg-bronze/40 mb-10" />

        <form onSubmit={mode === 'login' ? handleLogin : handleForgot} className="w-full space-y-4">
          <Input
            type="text"
            placeholder="USUÁRIO"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 border-white/10 focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider"
          />

          {mode === 'login' && (
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="SENHA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/10 focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          )}

          {isLoading && (
            <p className="text-[10px] text-white/40 uppercase text-center animate-pulse">
              {mode === 'login' ? 'Autenticando...' : 'Enviando...'}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-graphite hover:bg-bronze transition-colors duration-200 rounded-none text-[10px] uppercase tracking-widest mt-2"
          >
            {mode === 'login' ? 'Entrar' : 'Enviar Link'}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'forgot' : 'login')}
              className="text-[9px] uppercase tracking-[0.2em] text-white/40 hover:text-bronze transition-colors"
            >
              {mode === 'login' ? 'Esqueci minha senha' : 'Voltar ao login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
