import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Pencil, 
  FileText, 
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  Zap,
  Briefcase,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
    <div className="min-h-screen bg-[#1A1816] text-white">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Biblioteca de Serviços</h1>
              <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest font-bold">Módulo 05 · Catálogo de Serviços e Precificação</p>
            </div>
            <Button 
              onClick={() => {
                setEditingServico({ tipo: 'por_projeto', horas_estimadas: 0 });
                setIsModalOpen(true);
              }}
              className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-11 px-6 font-bold uppercase tracking-wider text-[11px] transition-all"
            >
              <Plus size={16} className="mr-2" />
              Novo Serviço
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Catálogo Ativo', value: stats.total, sub: 'Itens cadastrados', icon: Briefcase },
              { label: 'Ticket Médio', value: `R$ ${Math.round(stats.ticketMedio).toLocaleString()}`, sub: 'Base de cálculo', icon: TrendingUp },
              { label: 'Valor Hora', value: `R$ ${stats.custoHora.toFixed(2)}`, sub: 'Eficiência operacional', icon: Zap },
            ].map((m, i) => (
              <div 
                key={i}
                className="bg-[#242220] p-6 rounded-[2px] border border-white/10 shadow-sm relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">{m.label}</p>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{m.value}</h2>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider">{m.sub}</p>
                </div>
                <m.icon size={40} className="absolute right-[-10px] bottom-[-10px] text-bronze/5 group-hover:text-bronze/10 transition-colors" />
              </div>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 text-bronze animate-spin mb-4" />
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Carregando biblioteca...</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-10">
            {/* Main Content */}
            <div className="col-span-8 space-y-8">
              <div className="flex items-center justify-between bg-[#242220] p-4 border border-white/10 rounded-[2px] shadow-sm">
                <div className="flex gap-4">
                  {['all', 'por_projeto', 'por_m2', 'por_hora'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-[2px] transition-all",
                        filterType === type 
                          ? "bg-[#1A1A1A] text-white" 
                          : "text-muted-foreground hover:bg-[#F5F2EF] hover:text-[#1A1A1A]"
                      )}
                    >
                      {type === 'all' ? 'Tudo' : type.replace('por_', 'Por ')}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="BUSCAR SERVIÇO..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 w-64 border-white/10 rounded-[2px] text-[10px] uppercase tracking-widest bg-[#1A1816]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredServicos.map((s, idx) => (
                    <motion.div 
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-[#242220] p-8 border border-white/10 rounded-[2px] shadow-sm hover:border-bronze/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-bronze/10 text-bronze rounded-[1px]">
                              {s.tipo.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                              <Clock size={12} className="text-bronze/40" />
                              {(s.nome === 'Acompanhamento de Obra' || s.nome === 'EVF — Viabilidade Financeira' || s.horas_estimadas === 0) ? 'Variável' : `${s.horas_estimadas}h estimadas`}
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-white group-hover:text-bronze transition-colors mb-2">
                            {s.nome}
                          </h3>
                          
                          <p className="text-[12px] text-muted-foreground leading-relaxed max-w-xl">
                            {s.descricao}
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end justify-between min-h-[100px]">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Valor sugerido</p>
                            <h4 className="text-2xl font-bold text-white">
                              R$ {Math.round(calcularValor(s)).toLocaleString()}
                              {s.tipo === 'por_m2' && <span className="text-xs font-normal text-muted-foreground ml-1">/m²</span>}
                              {s.tipo === 'por_hora' && <span className="text-xs font-normal text-muted-foreground ml-1">/h</span>}
                            </h4>
                          </div>

                          <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingServico(s);
                                setIsModalOpen(true);
                              }}
                              className="h-8 text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-bronze hover:bg-bronze/5"
                            >
                              <Pencil size={12} className="mr-2" />
                              Editar
                            </Button>
                            <Button 
                              size="sm"
                              className="h-8 bg-[#1A1A1A] hover:bg-bronze text-white rounded-[1px] text-[9px] uppercase font-bold tracking-widest px-4 transition-all"
                            >
                              Usar
                              <ArrowRight size={12} className="ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="col-span-4">
              <div className="sticky top-8 space-y-6">
                <div className="bg-[#1A1A1A] text-white p-8 rounded-[2px] shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                  
                  <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="p-2 bg-bronze rounded-[1px]">
                      <FileText size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">Ativos Digitais</h3>
                      <p className="text-[8px] text-white/40 uppercase tracking-[0.1em]">Templates Oficiais NL</p>
                    </div>
                  </div>

                  <div className="space-y-8 relative z-10">
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
                        title: "Propostas",
                        items: [
                          { name: "Proposta ArqInt", url: "https://nlarquitetosapresentacao.lovable.app/proposta/arqint" },
                          { name: "Proposta Interiores", url: "https://nlarquitetosapresentacao.lovable.app/proposta/int" },
                          { name: "Proposta Comercial", url: "https://nlarquitetosapresentacao.lovable.app/proposta/comercial" },
                        ]
                      }
                    ].map((group, idx) => (
                      <div key={idx}>
                        <h4 className="text-[9px] font-bold uppercase tracking-[0.25em] text-bronze mb-4 flex items-center gap-2">
                          <div className="h-[1px] w-4 bg-bronze/30" />
                          {group.title}
                        </h4>
                        <div className="space-y-2">
                          {group.items.map((item, i) => (
                            <a 
                              key={i}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between group/link p-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-bronze/30 transition-all rounded-[1px]"
                            >
                              <span className="text-[10px] font-medium tracking-wide text-white/80 group-hover/link:text-white transition-colors">
                                {item.name}
                              </span>
                              <ExternalLink size={12} className="text-white/20 group-hover/link:text-bronze transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border border-white/10 rounded-[2px] bg-[#242220]">
                  <div className="flex items-center gap-2 mb-3 text-bronze">
                    <Info size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aviso</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-medium">
                    Os valores sugeridos são calculados com base no custo/hora e margem de lucro definidos na <span className="text-bronze font-bold">Base Financeira</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New/Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-[#E8E4DF] text-[#1A1A1A] rounded-[2px] p-0 max-w-lg overflow-hidden shadow-2xl">
          <div className="p-10">
            <header className="mb-8">
              <h2 className="text-2xl font-bold mb-1">
                {editingServico?.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                Cadastre ou atualize um item do seu catálogo
              </p>
            </header>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Nome do Serviço</label>
                <Input 
                  value={editingServico?.nome || ''} 
                  onChange={(e) => setEditingServico({...editingServico, nome: e.target.value})}
                  placeholder="Ex: Projeto Executivo"
                  className="bg-[#F8F9FA] border-[#E8E4DF] text-[#1A1A1A] rounded-[2px] h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Descrição / Escopo</label>
                <textarea 
                  value={editingServico?.descricao || ''}
                  onChange={(e) => setEditingServico({...editingServico, descricao: e.target.value})}
                  placeholder="Descreva o que está incluso..."
                  className="w-full h-28 bg-[#F8F9FA] border border-[#E8E4DF] text-[#1A1A1A] rounded-[2px] p-3 text-xs focus:ring-1 focus:ring-bronze outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Tipo de Cobrança</label>
                  <Select 
                    value={editingServico?.tipo} 
                    onValueChange={(v: any) => setEditingServico({...editingServico, tipo: v})}
                  >
                    <SelectTrigger className="bg-[#F8F9FA] border-[#E8E4DF] rounded-[2px] h-11 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="por_projeto">Por Projeto</SelectItem>
                      <SelectItem value="por_m2">Por m²</SelectItem>
                      <SelectItem value="por_hora">Por Hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">
                    {editingServico?.tipo === 'por_hora' ? 'Horas Base' : 'Horas Estimadas'}
                  </label>
                  <Input 
                    type="number"
                    value={editingServico?.horas_estimadas || ''} 
                    onChange={(e) => setEditingServico({...editingServico, horas_estimadas: Number(e.target.value)})}
                    placeholder="0"
                    className="bg-[#F8F9FA] border-[#E8E4DF] text-[#1A1A1A] rounded-[2px] h-11"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-[2px] h-11 text-[11px] uppercase tracking-widest font-bold border-[#E8E4DF]"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveServico}
                  className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-11 text-[11px] uppercase tracking-widest font-bold"
                >
                  Salvar Serviço
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibliotecaServicos;
