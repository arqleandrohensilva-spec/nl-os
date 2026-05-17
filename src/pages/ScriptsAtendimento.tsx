import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Copy, Bot, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  nome: string;
  tipo: string;
  cidade: string;
  stage: string;
}

const ScriptsAtendimento = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);
  const [mensagemCliente, setMensagemCliente] = useState('');
  const [sugestaoIA, setSugestaoIA] = useState<{ resposta: string; tom: string; proximo_passo: string } | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('leads').select('id, nome, tipo, cidade, stage');
      if (data) setLeads(data);
    };
    fetchLeads();
  }, []);

  const handleLeadChange = (id: string) => {
    setSelectedLeadId(id);
    setLeadAtivo(leads.find(l => l.id === id) || null);
  };

  const gerarSugestao = async () => {
    if (!leadAtivo || !mensagemCliente) return;
    toast.info("Consultando IA...");
    try {
      const response = await supabase.functions.invoke('chat-completions', {
        body: {
          prompt: `Você é o assistente de atendimento da NL Arquitetos. Sugira uma resposta para a mensagem do cliente abaixo.
          TOM OBRIGATÓRIO: profissional, condutor, centrado no cliente. Nunca informal, nunca ansioso, nunca com urgência artificial.
          LEAD: ${leadAtivo.nome} · ${leadAtivo.tipo} · ${leadAtivo.cidade}
          ETAPA ATUAL: ${leadAtivo.stage}
          MENSAGEM: ${mensagemCliente}
          Retorne APENAS JSON: {"resposta": "...", "tom": "...", "proximo_passo": "..."}`
        }
      });
      setSugestaoIA(response.data);
    } catch (e) {
      toast.error("Erro ao gerar sugestão");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar user="Sócio" />
      <div className="ml-[230px] flex-1 p-8 grid grid-cols-[35%,65%] gap-8">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">LEAD ATIVO</label>
            <Select onValueChange={handleLeadChange} value={selectedLeadId}>
              <SelectTrigger className="bg-[#141414] border-white/10 text-white">
                <SelectValue placeholder="Selecione um lead..." />
              </SelectTrigger>
              <SelectContent className="bg-[#141414] border-white/10">
                {leads.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.nome} · {l.tipo} · {l.stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leadAtivo && (
            <div className="bg-[#141414] p-4 border border-white/10 space-y-2">
              <p className="font-bold">{leadAtivo.nome}</p>
              <p className="text-bronze">{leadAtivo.tipo}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">{leadAtivo.cidade} · {leadAtivo.stage}</p>
            </div>
          )}

          <div className="bg-[#141414] p-4 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-bronze">
              <Bot size={16} />
              <p className="text-[10px] uppercase font-bold tracking-widest">ASSISTENTE DE ATENDIMENTO</p>
            </div>
            <Textarea 
              className="bg-[#0F0F0F] border-white/10 text-white" 
              placeholder="Cole aqui a mensagem ou pergunta do cliente..."
              value={mensagemCliente}
              onChange={(e) => setMensagemCliente(e.target.value)}
            />
            <Button className="w-full bg-bronze text-white hover:bg-bronze/90" onClick={gerarSugestao}>SUGERIR RESPOSTA · IA</Button>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-4">
            <h1 className="text-xl font-cormorant text-white">SCRIPTS DE ATENDIMENTO · NL</h1>
            <p className="text-[10px] uppercase text-white/40 tracking-widest">Etapas I a XI — Primeiro Contato ao Pós-Projeto</p>
            {/* Acordeões iriam aqui */}
        </div>
      </div>
    </div>
  );
};

export default ScriptsAtendimento;