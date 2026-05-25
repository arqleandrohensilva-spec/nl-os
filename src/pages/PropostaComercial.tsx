import React from 'react';
import { useProposta } from '@/hooks/use-proposta-context';
import { 
  Calendar, 
  MapPin, 
  Maximize2, 
  Target, 
  CheckCircle2, 
  Clock, 
  Store
} from 'lucide-react';

const PropostaComercial = () => {
  const proposalData = useProposta();

  return (
    <div className=\"min-h-screen bg-white font-sans text-[#1A1A1A] pb-20\">
      <div id=\"secao-introducao\" className=\"bg-[#0F0F0F] py-12 px-6 text-center\">
        <div className="inline-block w-16 h-16 bg-bronze flex items-center justify-center text-white font-cormorant text-3xl mb-6 mx-auto shadow-lg">
          NL
        </div>
        <h1 className="text-white text-sm uppercase tracking-[0.4em] font-bold">NL Arquitetos</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10">
        <div className="bg-white border border-[#E8E4DF] shadow-xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-12 border-b border-[#F0EDEA]">
            <div>
              <p className="text-bronze text-[11px] uppercase tracking-[0.3em] font-bold mb-2">Apresentação de Proposta</p>
              <h2 className="text-4xl font-bold font-cormorant text-graphite">{proposalData.nome}</h2>
            </div>
            <div className="flex items-center gap-4 bg-[#F8F9FA] p-4 border border-[#F0EDEA]">
              <Store className="w-12 h-12 text-bronze" />
              <div>
                <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold">Tipo de Projeto</p>
                <p className="font-bold text-sm">Comercial & Corporativo</p>
              </div>
            </div>
          </div>

          <div id=\"secao-metodo\" className=\"grid grid-cols-1 md:grid-cols-2 gap-12 mb-16\">
            <div className="space-y-8">
              <h3 className="text-xl font-bold font-cormorant border-l-2 border-bronze pl-4 text-graphite">Detalhes do Projeto</h3>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-black/40 mb-1">
                    <MapPin size={14} className="text-bronze" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Localização</span>
                  </div>
                  <p className="text-sm font-medium text-graphite">{proposalData.cidade}, {proposalData.estado}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-black/40 mb-1">
                    <Maximize2 size={14} className="text-bronze" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Área Estimada</span>
                  </div>
                  <p className="text-sm font-medium text-graphite">{proposalData.area} m²</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-black/40 mb-1">
                    <Calendar size={14} className="text-bronze" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Data da Proposta</span>
                  </div>
                  <p className="text-sm font-medium text-graphite">{proposalData.data}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-black/40 mb-1">
                    <Clock size={14} className="text-bronze" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Validade</span>
                  </div>
                  <p className="text-sm font-medium text-graphite">{proposalData.validade}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-black/40 mb-1">
                  <Target size={14} className="text-bronze" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Objetivo do Projeto</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  "{proposalData.objetivo}"
                </p>
              </div>
            </div>

            <div id=\"secao-valores\" className=\"space-y-8\">
              <h3 className="text-xl font-bold font-cormorant border-l-2 border-bronze pl-4 text-graphite">Investimento</h3>
              
              <div className="space-y-6">
                <div className="bg-[#F8F9FA] p-6 border border-[#F0EDEA] relative overflow-hidden group hover:border-bronze/30 transition-all">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-black/40 mb-2 font-bold">Pacote Executivo</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-bronze">R$</span>
                    <h4 className="text-3xl font-bold text-graphite">{proposalData.valor_executivo}</h4>
                  </div>
                  <p className="text-[9px] text-black/40 mt-2 uppercase tracking-wider italic">*Projeto técnico e detalhamento para execução.</p>
                </div>

                <div className="bg-[#1A1A1A] p-6 border border-transparent relative overflow-hidden group">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-bronze/60 mb-2 font-bold">Pacote Completo (Premium)</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-bronze">R$</span>
                    <h4 className="text-3xl font-bold text-white">{proposalData.valor_completo}</h4>
                  </div>
                  <p className="text-[9px] text-white/40 mt-2 uppercase tracking-wider italic">*Executivo + Acompanhamento + Curadoria de mobiliário.</p>
                  <div className="absolute top-4 right-4 text-bronze/20">
                    <CheckCircle2 size={32} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id=\"secao-contato\" className=\"bg-[#F8F9FA] p-8 border-t border-[#F0EDEA] text-center\">
            <h4 className="font-cormorant text-xl font-bold mb-4 text-graphite">Próximos Passos</h4>
            <p className="text-sm text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
              Ficamos à disposição para esclarecer qualquer dúvida. Para seguir com a aprovação ou solicitar ajustes, entre em contato com nossa equipe.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://wa.me/5500000000000" 
                target="_blank" 
                rel="noreferrer"
                className="bg-bronze hover:bg-bronze/90 text-white px-8 py-3 rounded-[2px] font-bold uppercase tracking-widest text-[11px] transition-all w-full sm:w-auto text-center"
              >
                Falar com Consultor
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-black/40 mt-8 uppercase tracking-[0.3em] font-bold">
          © {new Date().getFullYear()} NL Arquitetura & Design · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default PropostaComercial;
