import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, MapPin, Phone, User, Clock, Check, X as XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  'Novo Lead': { label: 'Novo Lead', color: 'bg-zinc-500/10 text-zinc-500' },
  'Reunião Agendada': { label: 'Reunião Agendada', color: 'bg-blue-500/10 text-blue-500' },
  'Briefing Preenchido': { label: 'Briefing Preenchido', color: 'bg-yellow-500/10 text-yellow-500' },
  'Proposta Enviada': { label: 'Proposta Enviada', color: 'bg-orange-500/10 text-orange-500' },
  'Negociação': { label: 'Negociação', color: 'bg-[#8B7355]/10 text-[#8B7355]' },
  'Fechado': { label: 'Fechado', color: 'bg-green-500/10 text-green-500' },
  'Perdido': { label: 'Perdido', color: 'bg-red-500/10 text-red-500' }
};

const ClientesLista = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const queryClient = useQueryClient();
  const { data: briefingsPendentes, isLoading: loadingBriefings } = useQuery({
    queryKey: ['briefings-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('status', 'aguardando_triagem')
        .order('preenchido_em', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleAprovar = async (briefing: any) => {
    try {
      // 1. Criar cliente
      const { data: novoCliente, error: clienteError } = await supabase.from('clientes').insert({
        nome: briefing.nome,
        whatsapp: briefing.whatsapp,
        email: briefing.email,
        cidade: briefing.cidade,
        origem: briefing.origem,
        tipo_projeto: briefing.tipo_projeto,
        briefing_preenchido: true
      }).select().single();

      if (clienteError) throw clienteError;

      // 2. Criar lead no Pipeline
      const { error: leadError } = await supabase.from('leads').insert({
        nome: briefing.nome,
        whats: briefing.whatsapp,
        cidade: briefing.cidade,
        tipo: briefing.tipo_projeto === 'com' ? 'Comercial' : briefing.tipo_projeto === 'int' ? 'Interiores' : 'Arq+Int',
        stage: 'Novo Lead',
        origem: briefing.origem || 'Instagram',
        temp: 'Frio',
        score: 2,
        criado: new Date().toISOString(),
        area: 0,
        cliente_id: novoCliente.id
      });

      if (leadError) throw leadError;

      // 3. Atualizar briefing
      const { error: briefingUpdateError } = await supabase.from('briefings').update({
        status: 'aprovado',
        cliente_id: novoCliente.id
      }).eq('id', briefing.id);

      if (briefingUpdateError) throw briefingUpdateError;

      toast.success(`${briefing.nome} aprovado — ficha criada`);
      queryClient.invalidateQueries({ queryKey: ['briefings-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Erro ao aprovar briefing:', error);
      toast.error('Erro ao aprovar briefing');
    }
  };

  const handleArquivar = async (briefingId: string) => {
    try {
      const { error } = await supabase
        .from('briefings')
        .update({ status: 'arquivado' })
        .eq('id', briefingId);
      
      if (error) throw error;

      toast.success("Arquivado");
      queryClient.invalidateQueries({ queryKey: ['briefings-pendentes'] });
    } catch (error) {
      console.error('Erro ao arquivar briefing:', error);
      toast.error('Erro ao arquivar briefing');
    }
  };

  const filteredClientes = clientes?.filter(c => 
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase()) ||
    c.tipo_projeto?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-[#E8E4DF]">
      <Sidebar user="User" />
      
      <main className="flex-1 ml-[230px] p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-['Courier_New'] font-bold text-[#8B7355] tracking-tighter uppercase">CLIENTES</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-1 font-['Courier_New']">Gestão da carteira NL OS</p>
          </div>
          
          <Button 
            onClick={() => navigate('/clientes/novo')}
            className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 font-['Courier_New'] text-xs font-bold uppercase tracking-widest"
          >
            <Plus size={16} className="mr-2" />
            NOVO CLIENTE
          </Button>
        </div>

        {briefingsPendentes && briefingsPendentes.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#555555] text-white px-2 py-0.5 text-[10px] font-bold font-['Courier_New'] uppercase tracking-widest">
                {briefingsPendentes.length}
              </div>
              <h2 className="text-sm font-['Courier_New'] font-bold text-[#E8E4DF] tracking-widest uppercase">AGUARDANDO TRIAGEM</h2>
            </div>

            <div className="space-y-4">
              {briefingsPendentes.map((briefing) => (
                <div 
                  key={briefing.id}
                  className="bg-[#1A1816] border border-[#2A2A2A] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-['Courier_New'] font-bold text-[#555] uppercase tracking-[0.2em]">PRÉ-BRIEFING</span>
                      <span className="text-[10px] text-white/20 uppercase tracking-widest font-medium">
                        {briefing.preenchido_em ? `Recebido há ${formatDistanceToNow(new Date(briefing.preenchido_em), { locale: ptBR })}` : 'Recentemente'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#E8E4DF] mb-2 uppercase font-['Courier_New'] tracking-tight">
                      {briefing.nome}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-white/40">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-[#8B7355]/40" />
                        <span className="text-[10px] uppercase tracking-wider">
                          {briefing.tipo_projeto === 'com' ? 'Comercial' : briefing.tipo_projeto === 'int' ? 'Interiores' : 'Arq+Int'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#8B7355]/40" />
                        <span className="text-[10px] uppercase tracking-wider">{briefing.cidade || 'Não informada'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#8B7355]/40" />
                        <span className="text-[10px] uppercase tracking-wider">Orçamento: {(briefing.respostas as any)?.orcamento || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => handleAprovar(briefing)}
                      className="bg-[#8B7355] hover:bg-[#8B7355]/90 text-[#0F0E0C] rounded-none px-6 h-10 font-['Courier_New'] text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Check size={14} className="mr-2" />
                      APROVAR
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleArquivar(briefing.id)}
                      className="border-[#3A3A3A] bg-transparent hover:bg-white/5 text-white/40 rounded-none px-6 h-10 font-['Courier_New'] text-[10px] font-bold uppercase tracking-widest"
                    >
                      <XIcon size={14} className="mr-2" />
                      ARQUIVAR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px bg-white/5 my-12" />
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-sm font-['Courier_New'] font-bold text-[#E8E4DF]/40 tracking-widest uppercase">CARTEIRA DE CLIENTES</h2>
        </div>

        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#8B7355] transition-colors" size={18} />
          <Input 
            placeholder="BUSCAR POR NOME, CIDADE OU TIPO..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 focus:border-[#8B7355] rounded-none pl-12 h-14 font-['Courier_New'] text-xs tracking-widest uppercase text-white"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes?.map((cliente) => (
              <div 
                key={cliente.id}
                onClick={() => navigate(`/clientes/${cliente.id}`)}
                className="bg-[#1A1816] border border-white/5 p-6 hover:border-[#8B7355]/50 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-[#8B7355] opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-[1px]",
                    STATUS_BADGES[cliente.status_comercial]?.color || 'bg-white/10 text-white/40'
                  )}>
                    {cliente.status_comercial || 'Novo Lead'}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-4 group-hover:text-[#8B7355] transition-colors uppercase font-['Courier_New']">
                  {cliente.nome}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-white/40">
                    <MapPin size={14} className="text-[#8B7355]" />
                    <span className="text-[10px] uppercase tracking-wider">{cliente.cidade || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/40">
                    <Phone size={14} className="text-[#8B7355]" />
                    <span className="text-[10px] uppercase tracking-wider">{cliente.whatsapp || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/40 border-t border-white/5 pt-3 mt-3">
                    <User size={14} className="text-[#8B7355]/40" />
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold">
                      {cliente.tipo_projeto || 'SEM PROJETO'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredClientes?.length === 0 && !isLoading && (
          <div className="text-center py-20 border border-dashed border-white/10">
            <p className="text-white/20 text-xs uppercase tracking-widest font-['Courier_New']">Nenhum cliente encontrado</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientesLista;
