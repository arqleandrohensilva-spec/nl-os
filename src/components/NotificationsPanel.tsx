import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NotificationsPanel = ({ isOpen, onClose, className }: NotificationsPanelProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    }
  });

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'urgente': return <span className="text-red-500 text-lg">⚡</span>;
      case 'financeiro': return <span className="text-bronze text-lg">💰</span>;
      case 'projeto': return <span className="text-bronze text-lg">📋</span>;
      case 'satisfacao': return <span className="text-green-500 text-lg">⭐</span>;
      default: return <span className="text-bronze text-lg">📋</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={cn(
            "absolute mt-4 w-[320px] bg-[#0F0E0C] border border-white/5 shadow-2xl z-[60] flex flex-col max-h-[480px]",
            className
          )}
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-bronze uppercase tracking-widest">NOTIFICAÇÕES</span>
            <button 
              onClick={() => markAllAsRead.mutate()}
              className="text-[9px] text-white/40 hover:text-white uppercase font-bold"
            >
              Marcar todas como lidas
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-white/20 text-xs italic">Nenhuma notificação.</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  onClick={() => {
                    markAsRead.mutate(notification.id);
                    navigate(notification.modulo);
                    onClose();
                  }}
                  className={cn(
                    "p-4 border-b border-white/5 cursor-pointer transition-colors flex gap-4 items-start",
                    !notification.lida ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="mt-1">{getNotificationIcon(notification.tipo)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-white leading-relaxed">{notification.titulo}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
