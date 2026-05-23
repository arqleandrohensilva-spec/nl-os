import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { 
  Search, 
  Plus, 
  ChevronRight, 
  MapPin, 
  Maximize2, 
  Calculator,
  Loader2,
  Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Lead {
  id: string;
  nome: string;
  tipo: string;
  cidade: string;
  area: number;
  temp: string;
}

const CalculadoraList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, tipo, cidade, area, temp')
        .order('nome');
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleLeadSelect = async (lead: Lead) => {
    try {
      // First, check if there's already a proposal for this lead to avoid duplicates
      // Or just create a new one every time? Usually, tracking is per proposal.
      // But the user said: "Ao clicar no lead -> abre a calculadora já preenchida com os dados dele"
      
      // We need a proposal_id. Let's look for an existing proposal for this client name or create one.
      const { data: existingProposal } = await supabase
        .from('proposals')
        .select('id')
        .eq('cliente', lead.nome)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingProposal) {
        navigate(`/calculadora/${existingProposal.id}`);
      } else {
        // Create a basic proposal to start with
        const { data: newProposal, error: createError } = await supabase
          .from('proposals')
          .insert({
            cliente: lead.nome,
            tipo: (['ArqInt', 'Interiores', 'Comercial'].includes(lead.tipo) ? lead.tipo : 'ArqInt') as any,
            cidade: lead.cidade,
            area: lead.area,
            status: 'Enviada',
            data: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (createError) throw createError;
        navigate(`/calculadora/${newProposal.id}`);
      }
    } catch (error) {
      console.error('Error selecting lead:', error);
      toast.error('Erro ao iniciar calculadora');
    }
  };

  const handleStandalone = () => {
    navigate('/calculadora/nova-proposta');
  };

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-[#E8E4DF]">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 pl-[230px]">
        <div className="container mx-auto px-10 py-12 max-w-5xl">
          <header className="mb-12">
            <h1 className="text-4xl font-mono font-bold uppercase tracking-[0.2em] text-[#8B7355] mb-2">
              CALCULADORA DE PROPOSTA
            </h1>
            <p className="text-sm text-[#E8E4DF]/60 font-light tracking-widest uppercase">
              Selecione um lead para calcular a proposta
            </p>
          </header>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="relative w-full md:w-96">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E8E4DF]/30" />
                <Input 
                  placeholder="BUSCAR LEAD PELO NOME..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 rounded-none focus:border-[#8B7355] transition-all uppercase text-[10px] tracking-widest font-mono"
                />
              </div>

              <Button 
                onClick={handleStandalone}
                variant="outline"
                className="h-11 rounded-none border-white/10 hover:border-[#8B7355] bg-transparent text-[#E8E4DF]/60 hover:text-[#E8E4DF] text-[10px] uppercase font-bold tracking-widest px-6 transition-all"
              >
                <Plus size={16} className="mr-2" />
                Nova proposta avulsa
              </Button>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-none overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 text-[#8B7355] animate-spin mb-4" />
                  <span className="text-[10px] uppercase tracking-widest text-[#E8E4DF]/40 font-bold">Carregando leads...</span>
                </div>
              ) : filteredLeads.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {filteredLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      onClick={() => handleLeadSelect(lead)}
                      className="group flex items-center justify-between p-6 hover:bg-white/[0.03] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 flex items-center justify-center bg-[#8B7355]/10 border border-[#8B7355]/20 group-hover:bg-[#8B7355]/20 transition-all">
                          <Users size={20} className="text-[#8B7355]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#E8E4DF] group-hover:text-white transition-colors">{lead.nome}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] uppercase tracking-widest text-[#8B7355] font-bold">{lead.tipo}</span>
                            <div className="flex items-center gap-1 text-[10px] text-[#E8E4DF]/40">
                              <MapPin size={10} />
                              <span className="uppercase tracking-widest">{lead.cidade}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#E8E4DF]/40">
                              <Maximize2 size={10} />
                              <span className="uppercase tracking-widest">{lead.area}M²</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <Badge className={cn(
                          "px-3 py-1 rounded-none text-[8px] font-bold uppercase tracking-[0.2em] border",
                          lead.temp === 'Quente' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          lead.temp === 'Morno' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-white/5 text-[#E8E4DF]/40 border-white/10"
                        )}>
                          {lead.temp}
                        </Badge>
                        <ChevronRight size={18} className="text-[#E8E4DF]/20 group-hover:text-[#8B7355] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 opacity-40">
                  <Calculator size={32} className="mb-4 text-[#E8E4DF]/20" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Nenhum lead encontrado</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalculadoraList;
