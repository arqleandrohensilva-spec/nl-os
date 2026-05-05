import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Login from '@/components/Login';

const LoginPage = () => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-bronze/20 border-t-bronze rounded-full animate-spin" />
      </div>
    );
  }

  if (authed) return <Navigate to={from} replace />;

  return <Login onLogin={() => {}} />;
};

export default LoginPage;
