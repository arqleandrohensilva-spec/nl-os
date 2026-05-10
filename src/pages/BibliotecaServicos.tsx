import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  Pencil, 
  FileText, 
  TrendingUp,
  Package,
  ArrowRight,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  Layers,
  Zap,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Servico {
  id: string;
  nome: string;
  descricao: string;
  horas_estimadas: number;
  tipo: 'por_projeto' | 'por_hora' | 'por_m2';
  ativo: boolean;
  vezes_usado: number;
  horas_reais_medias?: number;
}


const BibliotecaServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Partial<Servico> | null>(null);
  const prevCustoHora = useRef<number | null>(null);

  useEffect(() => {
    fetchData();
    
    // Listen for real-time config changes to warn about pricing updates
    const channel = supabase
      .channel('config-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'config_escritorio' }, (payload) => {
        if (payload.new.custo_hora !== prevCustoHora.current) {
          toast.info("Valores atualizados — custo/hora alterado na Base Financeira.", {
            icon: <Info size={14} className="text-bronze" />,
          });
          setConfig(payload.new);
          prevCustoHora.current = payload.new.custo_hora;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        supabase.from('servicos').select('*').order('nome'),
        supabase.from('config_escritorio').select('*').single()
      ]);

      setServicos((sRes.data || []) as Servico[]);
      setConfig(cRes.data);
      if (cRes.data?.custo_hora) {
        prevCustoHora.current = cRes.data.custo_hora;
      }
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const calcularValor = (servico: Servico | null | undefined) => {
    if (!servico) return 0;
    const custoHora = config?.custo_hora || 67.37;
    const margem = config?.margem_lucro || 40;
    const multiplicador = 1 + (margem / 100);

    if (servico.tipo === 'por_projeto') {
      return servico.horas_estimadas * custoHora * multiplicador;
    }
    // Para por_hora e por_m2, o valor exibido é o unitário
    if (servico.tipo === 'por_hora') {
      return custoHora * multiplicador;
    }
    if (servico.tipo === 'por_m2') {
      return servico.horas_estimadas * custoHora * multiplicador;
    }
    return 0;
  };

  const filteredServicos = useMemo(() => {
    return servicos.filter(s => {
      const matchesSearch = (s.nome?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (s.descricao?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesType = filterType === 'all' || s.tipo === filterType;
      return matchesSearch && matchesType;
    });
  }, [servicos, search, filterType]);

  const stats = useMemo(() => {
    const ticketMedio = servicos.length > 0 
      ? servicos.reduce((acc, s) => acc + calcularValor(s), 0) / servicos.length 
      : 0;
    return {
      total: servicos.length,
      ticketMedio,
      custoHora: config?.custo_hora || 67.37
    };
  }, [servicos, config]);

  const handleSaveServico = async () => {
    if (!editingServico?.nome || !editingServico?.tipo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        nome: editingServico.nome,
        descricao: editingServico.descricao,
        tipo: editingServico.tipo,
        horas_estimadas: Number(editingServico.horas_estimadas) || 0,
        ativo: true
      };

      if (editingServico.id) {
        await supabase.from('servicos').update(payload).eq('id', editingServico.id);
        toast.success('Serviço atualizado');
      } else {
        await supabase.from('servicos').insert(payload);
        toast.success('Serviço criado');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111111] selection:bg-bronze/20">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-16 pb-32">
        <header className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Sparkles size={14} className="text-bronze" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-bronze font-bold">Módulo 05 · Gestão de Portfólio</p>
            <Sparkles size={14} className="text-bronze" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl font-cormorant font-bold text-[#111111] mb-6 italic"
          >
            Biblioteca de Serviços
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="h-[1px] w-24 bg-bronze/30 mx-auto mb-10"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={() => {
                setEditingServico({ tipo: 'por_projeto', horas_estimadas: 0 });
                setIsModalOpen(true);
              }}
              className="bg-[#111111] hover:bg-bronze text-white rounded-none h-12 px-10 text-[10px] uppercase font-bold tracking-[0.2em] transition-all duration-500 hover:shadow-2xl hover:shadow-bronze/20"
            >
              <Plus size={16} className="mr-3" />
              Cadastrar Novo Serviço
            </Button>
          </motion.div>
        </header>

        {/* Premium Metrics Bar */}
        <div className="grid grid-cols-3 gap-8 mb-24">
          {[
            { label: 'CATÁLOGO ATIVO', value: stats.total, sub: 'Itens de Alta Performance', icon: Briefcase },
            { label: 'TICKET MÉDIO BASE', value: `R$ ${Math.round(stats.ticketMedio).toLocaleString()}`, sub: 'Precificação Estratégica', bronze: true, icon: TrendingUp },
            { label: 'VALOR HORA/ESC', value: `R$ ${stats.custoHora.toFixed(2)}`, sub: 'Eficiência Operacional', icon: Zap },
          ].map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="bg-[#111111] text-white p-10 rounded-none border border-white/5 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <m.icon size={60} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 font-bold">{m.label}</p>
                <h2 className={cn("text-5xl font-cormorant font-light mb-2", m.bronze ? "text-bronze" : "text-white")}>{m.value}</h2>
                <p className="text-[10px] uppercase tracking-wider text-white/20 font-bold">{m.sub}</p>
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] bg-bronze w-0 group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <Loader2 className="w-12 h-12 text-bronze animate-spin stroke-[1px]" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono animate-pulse">Sincronizando Biblioteca...</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-16">
            {/* Main Services Panel */}
            <div className="col-span-8 space-y-12">
              <div className="flex items-center justify-between pb-8 border-b border-[#E8E4DF]">
                <div className="flex gap-6">
                  {['all', 'por_projeto', 'por_m2', 'por_hora'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative py-2",
                        filterType === type ? "text-[#111111]" : "text-muted-foreground hover:text-bronze"
                      )}
                    >
                      {type === 'all' ? 'Tudo' : type.replace('por_', 'Por ')}
                      {filterType === type && (
                        <motion.div layoutId="activeFilter" className="absolute bottom-0 left-0 right-0 h-[2px] bg-bronze" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="relative group">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-bronze transition-colors" />
                  <Input 
                    placeholder="PESQUISAR NO CATÁLOGO..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 pl-12 w-80 border-[#E8E4DF] rounded-none text-[11px] font-mono tracking-widest placeholder:text-muted-foreground/30 bg-transparent focus-visible:ring-bronze/20 focus-visible:border-bronze"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-10">
                <AnimatePresence mode="popLayout">
                  {filteredServicos.map((s, idx) => (
                    <motion.div 
                      key={s.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative"
                    >
                      <div className="absolute -inset-4 bg-[#F5F2EF]/50 rounded-none opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10" />
                      
                      <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="text-[9px] uppercase tracking-[0.2em] text-bronze font-bold">
                              {s.tipo.replace('_', ' ')}
                            </span>
                            <div className="h-[1px] w-8 bg-bronze/20" />
                          </div>
                          
                          <h3 className="text-3xl font-cormorant font-bold text-[#111111] group-hover:text-bronze transition-colors leading-tight">
                            {s.nome}
                          </h3>
                          
                          <p className="text-[12px] text-muted-foreground font-mono leading-relaxed max-w-2xl">
                            {s.descricao}
                          </p>

                          <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#111111]/60">
                              <Clock size={14} className="text-bronze" />
                              <span>{s.nome === 'Acompanhamento de Obra' ? 'VARIÁVEL' : `${s.horas_estimadas}H ESTIMADAS`}</span>
                            </div>
                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                              Eficiência: {idx < 3 ? 'Premium' : 'Standard'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between min-w-[240px]">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Valor Base</p>
                            <h4 className="text-4xl font-cormorant font-bold text-[#111111]">
                              R$ {Math.round(calcularValor(s)).toLocaleString()}
                              <span className="text-sm font-sans font-light text-muted-foreground ml-1">
                                {s.tipo === 'por_m2' ? '/m²' : s.tipo === 'por_hora' ? '/h' : ''}
                              </span>
                            </h4>
                          </div>

                          <div className="flex gap-4 mt-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingServico(s);
                                setIsModalOpen(true);
                              }}
                              className="h-10 text-[10px] uppercase font-bold tracking-[0.2em] text-[#111111]/40 hover:text-bronze hover:bg-transparent px-0"
                            >
                              <Pencil size={12} className="mr-2" />
                              Edit Item
                            </Button>
                            <Button 
                              className="h-11 bg-transparent border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white rounded-none text-[10px] uppercase font-bold tracking-[0.2em] px-8 transition-all duration-300"
                            >
                              Usar em Proposta
                              <ArrowRight size={12} className="ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-10 h-[1px] w-full bg-[#E8E4DF]/40" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Panel - Premium Document Templates */}
            <div className="col-span-4">
              <div className="sticky top-12 space-y-12">
                <div className="p-10 bg-[#111111] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-bronze/10 blur-2xl rounded-full -mr-12 -mt-12" />
                  
                  <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className="p-2 bg-bronze/10 rounded-none border border-bronze/20">
                      <FileText size={18} className="text-bronze" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] mb-1">Templates</h3>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">Ativos de Marca NL</p>
                    </div>
                  </div>

                  <div className="space-y-10 relative z-10">
                    {[
                      {
                        title: "Apresentações",
                        items: [
                          { name: "Apresentação ArqInt", url: "https://nlarquitetosapresentacao.lovable.app/apresentacao/arqint" },
                          { name: "Apresentação Interiores", url: "https://nlarquitetosapresentacao.lovable.app/apresentacao/int" },
                          { name: "Apresentação Comercial", url: "https://nlarquitetosapresentacao.lovable.app/apresentacao/comercial" },
                        ]
                      },
                      {
                        title: "Propostas Técnicas",
                        items: [
                          { name: "Proposta ArqInt", url: "https://nlarquitetosapresentacao.lovable.app/proposta/arqint" },
                          { name: "Proposta Interiores", url: "https://nlarquitetosapresentacao.lovable.app/proposta/int" },
                          { name: "Proposta Comercial", url: "https://nlarquitetosapresentacao.lovable.app/proposta/comercial" },
                        ]
                      }
                    ].map((group, idx) => (
                      <div key={idx} className="space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="h-[1px] w-4 bg-bronze" />
                          <p className="text-[10px] uppercase tracking-[0.3em] text-bronze font-bold">{group.title}</p>
                        </div>
                        
                        <div className="space-y-4">
                          {group.items.map((doc, docIdx) => (
                            <motion.div 
                              key={docIdx} 
                              whileHover={{ x: 5 }}
                              className="group cursor-pointer"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <div className="flex items-center justify-between py-1">
                                <span className="text-[13px] font-cormorant font-bold text-white/80 group-hover:text-bronze transition-colors tracking-wide">
                                  {doc.name}
                                </span>
                                <ExternalLink size={12} className="text-white/20 group-hover:text-bronze transition-colors" />
                              </div>
                              <div className="h-[1px] w-full bg-white/5 group-hover:bg-bronze/30 transition-colors" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-6 border border-white/10 bg-white/5 flex items-center justify-between">
                    <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Standard Branding</p>
                    <div className="flex gap-1">
                      {[1,2,3].map(i => <div key={i} className="h-1 w-1 rounded-full bg-bronze/50" />)}
                    </div>
                  </div>
                </div>

                <div className="p-8 border border-[#E8E4DF] bg-white text-center">
                  <Layers size={20} className="text-bronze mx-auto mb-4" />
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Padronização NL</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-6">
                    A consistência visual em todos os pontos de contato eleva a percepção de valor do escritório.
                  </p>
                  <Button variant="outline" className="w-full rounded-none border-bronze text-bronze hover:bg-bronze hover:text-white text-[9px] uppercase font-bold tracking-[0.2em] h-10">
                    Ver Guia de Marca
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New/Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-md">
          <div className="p-8">
            <h2 className="text-2xl font-cormorant font-bold mb-1">{editingServico?.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-8 font-mono">Defina os parâmetros técnicos e precificação</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">Nome do Serviço</label>
                <Input 
                  value={editingServico?.nome || ''} 
                  onChange={(e) => setEditingServico({...editingServico, nome: e.target.value})}
                  className="bg-white/5 border-white/10 text-white rounded-none h-11 placeholder:text-white/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">Descrição</label>
                <textarea 
                  value={editingServico?.descricao || ''}
                  onChange={(e) => setEditingServico({...editingServico, descricao: e.target.value})}
                  className="w-full h-24 bg-white/5 border border-white/10 text-white rounded-none p-4 text-[11px] font-mono focus:border-bronze outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">Tipo de cobrança</label>
                <Select 
                  value={editingServico?.tipo} 
                  onValueChange={(val: any) => setEditingServico({...editingServico, tipo: val})}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                    <SelectItem value="por_projeto">Por Projeto (Valor Fixo)</SelectItem>
                    <SelectItem value="por_hora">Por Hora (Valor/h)</SelectItem>
                    <SelectItem value="por_m2">Por m² (Valor/m²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                  {editingServico?.tipo === 'por_m2' ? 'Horas por m²' : editingServico?.tipo === 'por_hora' ? 'Horas base' : 'Horas estimadas'}
                </label>
                <Input 
                  type="number"
                  value={editingServico?.horas_estimadas || ''} 
                  onChange={(e) => setEditingServico({...editingServico, horas_estimadas: Number(e.target.value)})}
                  className="bg-white/5 border-white/10 text-white rounded-none h-11"
                />
              </div>

              <div className="p-4 bg-bronze/5 border border-bronze/10 rounded-none space-y-2">
                <p className="text-[9px] uppercase tracking-widest text-bronze font-bold">Valor calculado em tempo real</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-cormorant font-bold text-white">
                    R$ {Math.round(calcularValor(editingServico as Servico)).toLocaleString()}
                  </h3>
                  <span className="text-[10px] text-white/40 font-mono mb-1.5">
                    ({editingServico?.horas_estimadas || 0}h × R$ {config?.custo_hora?.toFixed(2)} × {1 + (config?.margem_lucro || 40)/100})
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/40 hover:text-white">Cancelar</Button>
                <Button onClick={handleSaveServico} className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-12 text-[10px] uppercase font-bold tracking-widest">Salvar Serviço</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibliotecaServicos;
