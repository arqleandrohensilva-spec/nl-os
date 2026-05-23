import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Lock, 
  Download, 
  Clock, 
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ETAPAS_JORNADA = [
  'BRIEFING', 'CONCEITO', 'ESTUDO', 'EXECUTIVO', 'DETALHAMENTO', 'OBRA'
];

export default function PaginaCliente() {
  const { slug } = useParams();
  const location = useLocation();
  const param = slug || location.pathname.split('/').pop();
  const [projeto, setProjeto] = useState<any>(null);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<any>(null);
  const [nomeAprovador, setNomeAprovador] = useState('');
  const [textoAjuste, setTextoAjuste] = useState('');
  
  const [nomeMensagem, setNomeMensagem] = useState('');
  const [textoMensagem, setTextoMensagem] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);

  useEffect(() => {
    fetchProjeto();
  }, [param]);

  async function fetchProjeto() {
    try {
      setLoading(true);
      
      // Check if param is a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(param || "");
      
      let query = supabase.from('projetos').select('*');
      
      if (isUUID) {
        query = query.or(`token_cliente.eq.${param},slug_cliente.eq.${param}`);
      } else {
        query = query.eq('slug_cliente', param);
      }

      const { data: proj, error: projError } = await (query as any).maybeSingle();

      if (projError || !proj) {
        console.error("Erro ao buscar projeto:", projError);
        setError(true);
        return;
      }

      setProjeto(proj);

      const { data: etps } = await (supabase
        .from('projeto_etapas') as any)
        .select('*')
        .eq('projeto_id', proj.id)
        .order('criado_em', { ascending: true });
      
      setEtapas(etps || []);

      const { data: arqs } = await (supabase
        .from('arquivos_projeto') as any)
        .select('*')
        .eq('projeto_id', proj.id)
        .order('created_at', { ascending: true });

      setArquivos(arqs || []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: {
          action: 'get_link',
          path: path
        }
      });

      if (error) throw error;
      window.open(data.link, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar link de download.');
    }
  };

  const handleAprovar = async () => {
    if (!nomeAprovador.trim()) {
      toast.error('Informe seu nome completo.');
      return;
    }

    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      const { error: updateError } = await (supabase
        .from('projeto_etapas') as any)
        .update({
          status: 'Aprovado',
          aprovado_por: nomeAprovador,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', selectedEtapa.id);

      if (updateError) throw updateError;

      await (supabase.from('notificacoes') as any).insert({
        tipo: 'projeto',
        modulo: 'Projetos',
        titulo: '✅ Aprovação recebida',
        descricao: `${nomeAprovador} aprovou ${selectedEtapa.etapa} · ${projeto.nome_cliente}`
      });

      toast.success('Aprovação registrada com sucesso.');
      setShowAprovarModal(false);
      fetchProjeto();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar aprovação.');
    }
  };

  const handleSolicitarAjuste = async () => {
    if (!textoAjuste.trim()) {
      toast.error('Descreva o que precisa ser ajustado.');
      return;
    }

    try {
      await (supabase.from('mensagens_cliente') as any).insert({
        projeto_id: projeto.id,
        token_cliente: projeto.token_cliente,
        mensagem: textoAjuste,
        tipo: 'ajuste'
      });

      await (supabase.from('notificacoes') as any).insert({
        tipo: 'projeto',
        modulo: 'Projetos',
        titulo: '⚠️ Solicitação de ajuste',
        descricao: `${projeto.nome_cliente} solicitou ajuste em ${selectedEtapa.etapa}`
      });

      toast.success('Solicitação enviada.');
      setShowAjusteModal(false);
      setTextoAjuste('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar solicitação.');
    }
  };

  const handleEnviarMensagem = async () => {
    if (!textoMensagem.trim()) return;

    setEnviandoMensagem(true);
    try {
      await (supabase.from('mensagens_cliente') as any).insert({
        projeto_id: projeto.id,
        token_cliente: projeto.token_cliente,
        nome_remetente: nomeMensagem,
        mensagem: textoMensagem,
        tipo: 'mensagem'
      });

      await (supabase.from('notificacoes') as any).insert({
        tipo: 'projeto',
        modulo: 'Projetos',
        titulo: '💬 Nova mensagem do cliente',
        descricao: `${nomeMensagem || 'Cliente'} · ${projeto.nome_cliente}`
      });

      toast.success('Mensagem enviada. A NL retornará em breve.');
      setTextoMensagem('');
      setNomeMensagem('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-bronze animate-spin" />
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="font-cormorant text-4xl italic text-white mb-4">NL ARQUITETOS</h1>
          <p className="text-white/60 mb-2">Link inválido ou expirado.</p>
          <p className="text-white/40 text-sm">Entre em contato com a NL Arquitetos.</p>
        </div>
      </div>
    );
  }

  const etapasPendentes = etapas.filter(e => e.status === 'Aguardando aprovação');
  const arquivosPorEtapa = arquivos.reduce((acc: any, curr) => {
    const etapa = curr.etapa || 'Outros';
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(curr);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-bronze/30">
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-bronze/20 z-50 px-8 md:px-20 flex items-center justify-between">
        <h1 className="font-cormorant text-2xl italic">NL ARQUITETOS</h1>
        <span className="text-[10px] text-bronze uppercase tracking-[0.3em] font-medium hidden sm:block">
          A ARQUITETURA COMO DECISÃO
        </span>
      </header>

      <main className="pt-32 pb-20 px-8 md:px-20 max-w-7xl mx-auto space-y-20">
        
        <section className="space-y-6">
          <h2 className="font-cormorant text-4xl italic">Olá, {projeto.nome_cliente}.</h2>
          <div className="space-y-1">
            <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">SEU PROJETO</p>
            <p className="text-white/50 text-sm uppercase tracking-wider">
              {projeto.tipo || 'Projeto'} · {projeto.cidade || 'São José dos Campos'} · {projeto.area_m2 || '--'}m²
            </p>
            <p className="text-white/30 text-xs">
              Início: {projeto.data_inicio ? format(new Date(projeto.data_inicio), 'dd/MM/yyyy') : '--/--/----'}
            </p>
          </div>
        </section>

        <section className="space-y-8">
          <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">JORNADA DO PROJETO</p>
          <div className="relative overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex min-w-[600px] justify-between items-start pr-10">
              {ETAPAS_JORNADA.map((step, idx) => {
                const etapaData = etapas.find(e => e.etapa?.toUpperCase() === step);
                const isCurrent = projeto.etapa_atual?.toUpperCase() === step;
                const isApproved = etapaData?.status === 'Aprovado';
                
                return (
                  <div key={step} className="flex flex-col items-center text-center space-y-4 flex-1 relative">
                    {idx < ETAPAS_JORNADA.length - 1 && (
                      <div className="absolute top-1.5 left-1/2 w-full h-[1px] bg-white/10" />
                    )}
                    
                    <div className="z-10 bg-[#0A0A0A]">
                      {isApproved ? (
                        <div className="w-3 h-3 rounded-full bg-bronze" />
                      ) : isCurrent ? (
                        <div className="w-3 h-3 rounded-full bg-bronze animate-pulse ring-4 ring-bronze/20" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-white/20" />
                      )}
                    </div>

                    <div className="space-y-1 px-2">
                      <p className={`text-[10px] tracking-widest font-bold ${isCurrent || isApproved ? 'text-white' : 'text-white/20'}`}>
                        {step}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {etapaData?.data_entrega ? format(new Date(etapaData.data_entrega), 'dd/MM/yy') : 'A definir'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {etapasPendentes.length > 0 && (
          <section className="space-y-6">
            <div className="border border-bronze/30 bg-bronze/5 p-8 md:p-12 space-y-8">
              <div className="flex items-center gap-3 text-bronze">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">AGUARDANDO SUA APROVAÇÃO</span>
              </div>

              {etapasPendentes.map((etapa) => (
                <div key={etapa.id} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="font-cormorant text-3xl italic">{etapa.etapa}</h3>
                    <p className="text-white/40 text-xs">
                      Enviado em {format(new Date(etapa.updated_at || etapa.criado_em), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="border-bronze text-bronze hover:bg-bronze hover:text-white rounded-none uppercase text-[10px] tracking-widest h-12 px-8"
                      onClick={() => {
                        setSelectedEtapa(etapa);
                        setShowAprovarModal(true);
                      }}
                    >
                      APROVAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-white/50 hover:text-white hover:bg-white/5 rounded-none uppercase text-[10px] tracking-widest h-12"
                      onClick={() => {
                        setSelectedEtapa(etapa);
                        setShowAjusteModal(true);
                      }}
                    >
                      SOLICITAR AJUSTE
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-8">
          <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">ARQUIVOS DISPONÍVEIS</p>
          
          {Object.keys(arquivosPorEtapa).length === 0 ? (
            <p className="text-white/30 italic text-sm">Nenhum arquivo disponível ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {Object.entries(arquivosPorEtapa).map(([etapa, arqs]: [string, any]) => (
                <div key={etapa} className="space-y-6">
                  <div className="flex items-center gap-3 text-white/60">
                    <span className="text-lg">📁</span>
                    <span className="uppercase text-[10px] tracking-[0.2em] font-bold">{etapa}</span>
                  </div>
                  
                  <div className="space-y-6 pl-8 border-l border-white/5">
                    {arqs.map((arquivo: any) => (
                      <div key={arquivo.id} className="group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {arquivo.liberado ? (
                              <FileText className="w-5 h-5 text-bronze mt-0.5" />
                            ) : (
                              <Lock className="w-5 h-5 text-white/20 mt-0.5" />
                            )}
                            <div className="space-y-1">
                              <p className={`text-sm ${arquivo.liberado ? 'text-white' : 'text-white/30'}`}>
                                {arquivo.nome_arquivo}
                              </p>
                              {!arquivo.liberado && (
                                <p className="text-white/20 italic text-[10px]">Disponível em breve</p>
                              )}
                            </div>
                          </div>
                          
                          {arquivo.liberado && (
                            <button 
                              onClick={() => handleDownload(arquivo.dropbox_path)}
                              className="text-bronze hover:text-white transition-colors text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden group-hover:inline">BAIXAR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-8 max-w-2xl">
          <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">FALAR COM A NL</p>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40">Seu nome (opcional)</label>
              <Input 
                value={nomeMensagem}
                onChange={e => setNomeMensagem(e.target.value)}
                className="bg-[#1A1A1A] border border-white/10 border-white/10 focus:border-bronze/50 rounded-none h-12 text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40">Mensagem</label>
              <Textarea 
                value={textoMensagem}
                onChange={e => setTextoMensagem(e.target.value)}
                placeholder="Dúvida, observação ou pedido de ajuste..."
                className="bg-[#1A1A1A] border border-white/10 border-white/10 focus:border-bronze/50 rounded-none min-h-[120px] text-white text-sm resize-none"
              />
            </div>
            <Button 
              disabled={enviandoMensagem || !textoMensagem}
              onClick={handleEnviarMensagem}
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full h-14 uppercase text-[10px] tracking-[0.3em] font-bold"
            >
              {enviandoMensagem ? <Loader2 className="animate-spin" /> : 'ENVIAR MENSAGEM'}
            </Button>
          </div>
        </section>

      </main>

      <footer className="py-20 border-t border-white/5 px-8 flex flex-col items-center gap-4">
        <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] text-center">
          NL ARQUITETOS · São José dos Campos, SP
        </p>
        <p className="text-white/10 text-[8px] uppercase tracking-[0.6em] text-center">
          A ARQUITETURA COMO DECISÃO
        </p>
      </footer>

      <Dialog open={showAprovarModal} onOpenChange={setShowAprovarModal}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none text-white max-w-md">
          <DialogHeader className="space-y-4">
            <DialogTitle className="font-cormorant text-2xl italic">Confirmar aprovação de {selectedEtapa?.etapa}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40">Seu nome completo</label>
              <Input 
                autoFocus
                value={nomeAprovador}
                onChange={e => setNomeAprovador(e.target.value)}
                className="bg-[#1A1A1A] border border-white/10 border-white/10 focus:border-bronze/50 rounded-none h-12 text-white text-sm"
              />
            </div>
            <p className="text-[10px] text-white/20 leading-relaxed italic">
              Ao confirmar, você declara estar de acordo com os arquivos apresentados nesta etapa. 
              Seu IP e horário serão registrados para fins contratuais.
            </p>
          </div>
          <DialogFooter className="gap-4 sm:justify-start">
            <Button 
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none flex-1 uppercase text-[10px] tracking-widest h-12"
              onClick={handleAprovar}
            >
              CONFIRMAR APROVAÇÃO
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/40 hover:text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              onClick={() => setShowAprovarModal(false)}
            >
              CANCELAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 rounded-none text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cormorant text-2xl italic">O que precisa ser ajustado?</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Textarea 
              autoFocus
              value={textoAjuste}
              onChange={e => setTextoAjuste(e.target.value)}
              placeholder="Descreva detalhadamente..."
              className="bg-[#1A1A1A] border border-white/10 border-white/10 focus:border-bronze/50 rounded-none min-h-[150px] text-white text-sm resize-none"
            />
          </div>
          <DialogFooter className="gap-4 sm:justify-start">
            <Button 
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none flex-1 uppercase text-[10px] tracking-widest h-12"
              onClick={handleSolicitarAjuste}
            >
              ENVIAR SOLICITAÇÃO
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/40 hover:text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              onClick={() => setShowAjusteModal(false)}
            >
              CANCELAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
