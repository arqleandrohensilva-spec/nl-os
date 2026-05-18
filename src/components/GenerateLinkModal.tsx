import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, Copy, ExternalLink, Check } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface Proposal {
  id: string;
  cliente: string;
  tipo?: string;
  cidade?: string;
  area?: number;
  valor_executivo?: number;
  valor_completo?: number;
  objetivo?: string;
}

interface GenerateLinkModalProps {
  proposal: Proposal;
  isOpen: boolean;
  onClose: () => void;
  onLinkGenerated?: (link: string) => void;
}

const GenerateLinkModal = ({ proposal, isOpen, onClose, onLinkGenerated }: GenerateLinkModalProps) => {
  const [tipo, setTipo] = useState(proposal.tipo || 'ARQ+INT');
  const [nomeCliente, setNomeCliente] = useState(proposal.cliente);
  const [cidade, setCidade] = useState(proposal.cidade || '');
  const [area, setArea] = useState(proposal.area?.toString() || '');
  const [valorExecutivo, setValorExecutivo] = useState(proposal.valor_executivo?.toString() || '');
  const [valorCompleto, setValorCompleto] = useState(proposal.valor_completo?.toString() || '');
  const [objetivo, setObjetivo] = useState(proposal.objetivo || '');
  
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const gerarSlug = (nome: string) => nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').trim();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const typeSlug = tipo.toLowerCase().replace('+', '');
      const slug = gerarSlug(nomeCliente);
      const baseUrl = `https://proposta.nl.arq.br`;
      const finalLink = `${baseUrl}/p/${typeSlug}/${slug}`;

      // 1. Salvar no Supabase externo
      const response = await fetch('https://sjqazidnuqdqadbkawph.supabase.co/rest/v1/propostas_clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWF6aWRudXFkcWFkYmthd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI0NjMsImV4cCI6MjA5NDAwODQ2M30.vT_1aEOPjjw_KCKJ0KsAzJG40e07DvFSONICVIBAGHI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWF6aWRudXFkcWFkYmthd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI0NjMsImV4cCI6MjA5NDAwODQ2M30.vT_1aEOPjjw_KCKJ0KsAzJG40e07DvFSONICVIBAGHI',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          tipo: typeSlug,
          slug: slug,
          nome_cliente: nomeCliente,
          cidade: cidade,
          area: area || null,
          valor_executivo: valorExecutivo || null,
          valor_completo: valorCompleto || null,
          objetivo: objetivo,
        })
      });

      const responseText = await response.text();
      console.log('Status:', response.status);
      console.log('Response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      // 2. Salvar o link na tabela local do NL OS
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ link_proposta: finalLink })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      setGeneratedLink(finalLink);
      
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(finalLink);
      toast.success("Link gerado e copiado!");
      
      if (onLinkGenerated) onLinkGenerated(finalLink);
    } catch (error: any) {
      console.error('Erro ao gerar link:', error);
      toast.error(error.message || 'Erro ao gerar link da proposta');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copiado!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111111] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-cormorant text-bronze uppercase tracking-widest">
            GERAR LINK DA PROPOSTA
          </DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-[10px] uppercase tracking-widest text-white/40">Tipo de Proposta</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-[#1A1A1A] border-white/10 rounded-none focus:ring-bronze">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                  <SelectItem value="ARQ+INT">ARQ+INT</SelectItem>
                  <SelectItem value="Interiores">Interiores</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-[10px] uppercase tracking-widest text-white/40">Nome do Cliente</Label>
              <Input
                id="nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-[10px] uppercase tracking-widest text-white/40">Cidade (Opcional)</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area" className="text-[10px] uppercase tracking-widest text-white/40">Área m² (Opcional)</Label>
                <Input
                  id="area"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v_exec" className="text-[10px] uppercase tracking-widest text-white/40">Valor Executivo</Label>
                <Input
                  id="v_exec"
                  type="number"
                  value={valorExecutivo}
                  onChange={(e) => setValorExecutivo(e.target.value)}
                  className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v_comp" className="text-[10px] uppercase tracking-widest text-white/40">Valor Completo</Label>
                <Input
                  id="v_comp"
                  type="number"
                  value={valorCompleto}
                  onChange={(e) => setValorCompleto(e.target.value)}
                  className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo" className="text-[10px] uppercase tracking-widest text-white/40">Objetivo (Opcional)</Label>
              <Input
                id="objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="bg-[#1A1A1A] border-white/10 rounded-none focus:border-bronze"
              />
            </div>

            <Button
              className="w-full bg-bronze hover:bg-bronze/80 text-white font-bold uppercase tracking-widest rounded-none mt-4"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "GERANDO..." : "GERAR LINK"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center">
            <div className="p-4 bg-bronze/10 border border-bronze/20 text-bronze font-mono text-sm break-all">
              {generatedLink}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/10 hover:border-bronze hover:text-bronze text-white rounded-none uppercase text-[10px] tracking-widest"
                onClick={handleCopy}
              >
                <Copy size={14} className="mr-2" />
                COPIAR LINK
              </Button>
              <Button
                className="flex-1 bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[10px] tracking-widest"
                onClick={() => window.open(generatedLink, '_blank')}
              >
                <ExternalLink size={14} className="mr-2" />
                ABRIR
              </Button>
            </div>

            <Button
              variant="ghost"
              className="text-white/40 hover:text-white uppercase text-[9px] tracking-widest"
              onClick={() => setGeneratedLink(null)}
            >
              GERAR OUTRO LINK
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GenerateLinkModal;
