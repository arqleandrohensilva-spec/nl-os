import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X as XIcon, Phone, Mail, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: any;
  onAprovar: (briefing: any) => void;
  onArquivar: (briefingId: string) => void;
}

const BriefingModal = ({ isOpen, onClose, briefing, onAprovar, onArquivar }: BriefingModalProps) => {
  if (!briefing) return null;

  const r = briefing.respostas || {};
  const tipo = briefing.tipo_projeto;

  const renderContactInfo = () => (
    <div className="space-y-4">
      <h4 className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold border-b border-[#8B7355]/20 pb-2">DADOS DE CONTATO</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 text-white/60">
          <Phone size={14} className="text-[#8B7355]/60" />
          <span className="text-[11px] uppercase tracking-wider">{briefing.whatsapp || r.whatsapp || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <Mail size={14} className="text-[#8B7355]/60" />
          <span className="text-[11px] lowercase tracking-wider">{briefing.email || r.email || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <MapPin size={14} className="text-[#8B7355]/60" />
          <span className="text-[11px] uppercase tracking-wider">{briefing.cidade || r.cidade || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <Search size={14} className="text-[#8B7355]/60" />
          <span className="text-[11px] uppercase tracking-wider">Origem: {briefing.origem || r.origem || '—'}</span>
        </div>
      </div>
    </div>
  );

  const renderProjectInfo = () => {
    let content = null;

    if (tipo === 'arq') {
      content = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Lote Definido</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.imovel_definido || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Área Terreno</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.area_terreno ? `${r.area_terreno} m²` : '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Área Construída</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.area_estimada ? `${r.area_estimada} m²` : '—'}</p>
          </div>
        </div>
      );
    } else if (tipo === 'int') {
      content = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Tipo de Imóvel</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.tipo_imovel || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Área a Reformar</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.area_estimada ? `${r.area_estimada} m²` : '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Mobiliário</p>
            <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.mobiliario_aproveitado || '—'}</p>
          </div>
        </div>
      );
    } else if (tipo === 'com') {
      content = (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-widest">Tipo de Negócio</p>
              <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.tipo_negocio || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-widest">Perfil do Público</p>
              <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.perfil_cliente || '—'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">Experiência do Cliente</p>
            <p className="text-xs text-white/80 leading-relaxed italic">{r.experiencia_cliente || '—'}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h4 className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold border-b border-[#8B7355]/20 pb-2">O PROJETO</h4>
        {content}
      </div>
    );
  };

  const renderAlignment = () => (
    <div className="space-y-4">
      <h4 className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold border-b border-[#8B7355]/20 pb-2">ALINHAMENTO</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">Estilo</p>
          <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.estilo_referencia || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">Orçamento</p>
          <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.orcamento || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">Prazo</p>
          <p className="text-xs text-white/80 uppercase tracking-wider font-medium">{r.prazo || '—'}</p>
        </div>
      </div>
      {r.obs && (
        <div className="space-y-1 mt-4">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">Observações</p>
          <p className="text-xs text-white/60 leading-relaxed font-['Courier_New']">{r.obs}</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0F0E0C] border-[#2A2A2A] text-[#E8E4DF] p-0 gap-0 overflow-hidden rounded-none">
        <DialogHeader className="p-8 border-b border-[#2A2A2A]">
          <DialogTitle className="text-lg font-bold font-['Courier_New'] text-[#8B7355] uppercase tracking-widest">
            PRÉ-BRIEFING — {briefing.nome}
          </DialogTitle>
        </DialogHeader>


        <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
          {renderContactInfo()}
          {renderProjectInfo()}
          {renderAlignment()}
        </div>

        <div className="p-6 border-t border-[#2A2A2A] bg-[#0F0E0C] flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              onArquivar(briefing.id);
              onClose();
            }}
            className="border-[#3A3A3A] bg-transparent hover:bg-white/5 text-white/40 rounded-none px-8 h-12 font-['Courier_New'] text-[10px] font-bold uppercase tracking-widest"
          >
            <XIcon size={14} className="mr-2" />
            ARQUIVAR
          </Button>
          <Button 
            onClick={() => {
              onAprovar(briefing);
              onClose();
            }}
            className="bg-[#8B7355] hover:bg-[#8B7355]/90 text-[#0F0E0C] rounded-none px-8 h-12 font-['Courier_New'] text-[10px] font-bold uppercase tracking-widest"
          >
            <Check size={14} className="mr-2" />
            APROVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BriefingModal;