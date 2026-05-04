import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Login = ({ onLogin }: { onLogin: (user: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Convert username to email if it doesn't look like one
    const email = username.includes('@') ? username : `${username}@nlarquitetos.com.br`;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast.error('Usuário ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      }
    } catch (err) {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        <h1 className="text-[56px] font-cormorant leading-tight text-graphite mb-1">NL OS</h1>
        <p className="text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-6">
          Sistema Operacional · NL Arquitetos
        </p>
        
        <div className="w-8 h-[1px] bg-bronze/40 mb-10" />

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-1">
            <Input
              type="text"
              placeholder="USUÁRIO"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 border-beige focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider"
            />
          </div>
          <div className="space-y-1">
            <Input
              type="password"
              placeholder="SENHA"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-beige focus:border-bronze focus:ring-0 rounded-none text-xs tracking-wider"
            />
          </div>
          
          {error && <p className="text-[10px] text-red uppercase text-center">{error}</p>}
          
          <Button 
            type="submit" 
            className="w-full h-11 bg-graphite hover:bg-bronze transition-colors duration-200 rounded-none text-[10px] uppercase tracking-widest mt-2"
          >
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
