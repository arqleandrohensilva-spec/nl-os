import { supabase } from '@/integrations/supabase/client';

/**
 * Detecta se o app está rodando dentro do ambiente de PREVIEW/EDITOR do Lovable.
 * NUNCA retorna true nos domínios publicados (nl-os.lovable.app, app.nl.arq.br),
 * garantindo que o bypass de login só exista enquanto você mexe pelo Lovable.
 */
export const isLovablePreview = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host.includes('id-preview--') ||
    host.endsWith('.lovableproject.com') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
};

// Usuário fixo usado apenas no preview do Lovable (login automático).
const DEV_EMAIL = 'leandro@nlarquitetos.com.br';
const DEV_PASSWORD = 'NLarq#2026!Temp';

/**
 * Tenta autenticar automaticamente com o usuário fixo.
 * Deve ser chamado somente quando isLovablePreview() é true.
 */
export const autoLoginPreview = async (): Promise<boolean> => {
  const { error } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  return !error;
};
