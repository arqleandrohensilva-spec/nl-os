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
  const getInitialTipo = () => {
    if (!proposal.tipo) return 'arqint';
    const t = proposal.tipo.toLowerCase();
    if (t === 'interiores' || t === 'int') return 'int';
    if (t === 'arq+int' || t === 'arqint') return 'arqint';
    if (t === 'comercial') return 'comercial';
    return 'arqint';
  };

  const [tipo, setTipo] = useState(getInitialTipo());
  const [nomeCliente, setNomeCliente] = useState(proposal.cliente);
  const [cidade, setCidade] = useState(proposal.cidade || '');
  const [area, setArea] = useState(proposal.area?.toString() || '');
  const [valorExecutivo, setValorExecutivo] = useState(proposal.valor_executivo?.toString() || '');
  const [valorCompleto, setValorCompleto] = useState(proposal.valor_completo?.toString() || '');
  const [objetivo, setObjetivo] = useState(proposal.objetivo || '');
  const [tipoNegocio, setTipoNegocio] = useState('');
  
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const gerarSlug = (nome: string) => nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').trim();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const typeSlug = tipo;
      
      // Validação básica do tipo
      const tiposValidos = ['arqint', 'int', 'comercial'];
      if (!tiposValidos.includes(typeSlug)) {
        throw new Error(`Tipo de proposta inválido: ${typeSlug}`);
      }

      let tipo_negocio = "";
      if (typeSlug === 'arqint') tipo_negocio = "Residencial";
      else if (typeSlug === 'int') tipo_negocio = "Interiores";
      else if (typeSlug === 'comercial') tipo_negocio = tipoNegocio;

      const baseSlug = gerarSlug(nomeCliente);
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      const slugAttempts = [
        baseSlug,
        `${baseSlug}-${timestamp}`,
        `${baseSlug}-${timestamp}-${Math.floor(Math.random() * 1000)}`
      ];

      let finalLink = "";
      let finalSlug = "";

      // Loop de tentativas para tratar conflitos de slug (Erro 409)
      for (const attemptSlug of slugAttempts) {
        try {
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
              slug: attemptSlug,
              nome_cliente: nomeCliente,
              cidade: cidade,
              area: area || null,
              valor_executivo: valorExecutivo || null,
              valor_completo: valorCompleto || null,
              objetivo: objetivo,
              tipo_negocio: tipo_negocio,
            })
          });

          if (response.ok) {
            finalSlug = attemptSlug;
            const baseUrl = `https://proposta.nl.arq.br`;
            finalLink = `${baseUrl}/p/${typeSlug}/${finalSlug}`;
            break;
          } else if (response.status === 409) {
            console.warn(`Conflito de slug (${attemptSlug}), tentando próxima variação...`);
            continue;
          } else {
            const responseText = await response.text();
            console.error('Erro Supabase Externo:', response.status, responseText);
            throw new Error(`Erro ao salvar no servidor de propostas (HTTP ${response.status})`);
          }
        } catch (err: any) {
          // Se for 409, o loop continua. Se for outro erro, interrompe a menos que seja erro de rede
          if (err.message?.includes('409')) continue;
          throw err;
        }
      }

      if (!finalLink) {
        throw new Error("Não foi possível gerar um link único após várias tentativas.");
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
      toast.success("Link gerado e copiado com sucesso!");
      
      if (onLinkGenerated) onLinkGenerated(finalLink);
    } catch (error: any) {
      console.error('Erro detalhado ao gerar link:', error);
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
      <DialogContent className="bg-[#0D0D0D] border-white/[0.12] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-cormorant text-bronze uppercase tracking-widest">
            GERAR LINK DA PROPOSTA
          </DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Tipo de Proposta</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:ring-bronze">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#161616] border border-white/[0.12] border-white/[0.12] text-white">
                  <SelectItem value="arqint">ARQ+INT</SelectItem>
                  <SelectItem value="int">Interiores</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {tipo === 'comercial' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="tipoNegocio" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Tipo de Negócio</Label>
                <Input
                  id="tipoNegocio"
                  value={tipoNegocio}
                  onChange={(e) => setTipoNegocio(e.target.value)}
                  placeholder="Ex: Barbearia, Clínica, Restaurante..."
                  className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Nome do Cliente</Label>
              <Input
                id="nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Cidade (Opcional)</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Área m² (Opcional)</Label>
                <Input
                  id="area"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v_exec" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Valor Executivo</Label>
                <Input
                  id="v_exec"
                  type="number"
                  value={valorExecutivo}
                  onChange={(e) => setValorExecutivo(e.target.value)}
                  className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v_comp" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Valor Completo</Label>
                <Input
                  id="v_comp"
                  type="number"
                  value={valorCompleto}
                  onChange={(e) => setValorCompleto(e.target.value)}
                  className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo" className="text-[10px] uppercase tracking-widest text-white/[0.4]">Objetivo (Opcional)</Label>
              <Input
                id="objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="bg-[#161616] border border-white/[0.12] border-white/[0.12] rounded-none focus:border-bronze"
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
                className="flex-1 border-white/[0.12] hover:border-bronze hover:text-bronze text-white rounded-none uppercase text-[10px] tracking-widest"
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
              className="text-white/[0.4] hover:text-white uppercase text-[9px] tracking-widest"
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
