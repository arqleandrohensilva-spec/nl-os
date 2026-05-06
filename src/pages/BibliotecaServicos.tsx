import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  Pencil, 
  FileText, 
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  Clock,
  ExternalLink,
  ChevronRight,
  Info
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

interface Template {
  id: string;
  nome: string;
  descricao: string;
  servicos_ids: string[];
  ajuste_area: boolean;
}

const BibliotecaServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Partial<Servico> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, tRes, cRes] = await Promise.all([
        supabase.from('servicos').select('*').order('nome'),
        supabase.from('templates_escopo').select('*').order('nome'),
        supabase.from('config_escritorio').select('*').single()
      ]);

      setServicos((sRes.data || []) as Servico[]);
      setTemplates(tRes.data || []);
      setConfig(cRes.data);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const calcularValor = (servico: Servico) => {
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
      const matchesSearch = s.nome.toLowerCase().includes(search.toLowerCase()) || 
                          s.descricao.toLowerCase().includes(search.toLowerCase());
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
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12 pb-24">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-[28px] font-cormorant font-bold text-[#1A1A1A] mb-1">Biblioteca de Serviços</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Módulo 05 · Catálogo de serviços e precificação</p>
          </div>
          <Button 
            onClick={() => {
              setEditingServico({ tipo: 'por_projeto', horas_estimadas: 0 });
              setIsModalOpen(true);
            }}
            className="bg-graphite hover:bg-bronze text-white rounded-[2px] h-10 px-8 text-[10px] uppercase font-bold tracking-widest"
          >
            <Plus size={14} className="mr-2" />
            Novo Serviço
          </Button>
        </header>

        {/* Metrics Bar */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {[
            { label: 'SERVIÇOS CADASTRADOS', value: stats.total, sub: 'Itens no catálogo' },
            { label: 'TICKET MÉDIO', value: `R$ ${Math.round(stats.ticketMedio).toLocaleString()}`, sub: 'Valor base por item', bronze: true },
            { label: 'CUSTO/HORA BASE', value: `R$ ${stats.custoHora.toFixed(2)}`, sub: 'atualizado da Base Financeira' },
          ].map((m, i) => (
            <div key={i} className="bg-white border border-[#E8E4DF] p-8 rounded-[4px] border-b-2 border-b-bronze relative overflow-hidden">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">{m.label}</p>
              <h2 className={cn("text-4xl font-cormorant font-bold mb-1", m.bronze ? "text-bronze" : "text-[#1A1A1A]")}>{m.value}</h2>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-bold">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-10 gap-12">
          {/* Main Services Panel */}
          <div className="col-span-6 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['all', 'por_projeto', 'por_m2', 'por_hora'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-[1px] border",
                      filterType === type ? "bg-graphite text-white border-graphite" : "bg-white text-muted-foreground border-[#E8E4DF] hover:border-bronze"
                    )}
                  >
                    {type === 'all' ? 'Todos' : type.replace('por_', 'Por ')}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <Input 
                  placeholder="BUSCAR SERVIÇO..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 w-64 border-[#E8E4DF] rounded-[2px] text-[10px] font-mono tracking-widest placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredServicos.map((s, idx) => (
                <div 
                  key={s.id} 
                  className={cn(
                    "bg-white border border-[#E8E4DF] p-6 rounded-[4px] transition-all duration-300 hover:border-bronze/50 group flex flex-col justify-between",
                    idx < 3 && "border-l-2 border-l-bronze"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-bronze/10 text-bronze font-bold">
                        {s.tipo.replace('_', ' ')}
                      </span>
                      <h3 className="text-xl font-cormorant font-bold text-[#1A1A1A] group-hover:text-bronze transition-colors">{s.nome}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-cormorant font-bold text-bronze">R$ {Math.round(calcularValor(s)).toLocaleString()}{s.tipo === 'por_m2' ? '/m²' : s.tipo === 'por_hora' ? '/h' : ''}</p>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed mb-6 line-clamp-2">{s.descricao}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-[#F5F2EF]">
                    <div className="flex items-center gap-4 text-[9px] font-mono text-muted-foreground/60">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{s.horas_estimadas}h estimadas</span>
                      </div>
                      <span className="text-muted-foreground/20">|</span>
                      <span>R$ {config?.custo_hora?.toFixed(2)}/h × {config?.margem_lucro}% margem</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingServico(s);
                          setIsModalOpen(true);
                        }}
                        className="h-8 text-[9px] uppercase font-bold tracking-widest text-muted-foreground hover:text-bronze hover:bg-transparent"
                      >
                        <Pencil size={12} className="mr-1.5" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 border-graphite text-graphite hover:bg-graphite hover:text-white rounded-[2px] text-[9px] uppercase font-bold tracking-widest px-4"
                      >
                        Usar em Proposta
                        <ChevronRight size={12} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Scope Templates */}
          <div className="col-span-4 space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <Layers size={18} className="text-bronze" />
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]">Templates de Escopo</h3>
            </div>

            <div className="space-y-4">
              {templates.map(t => {
                const templateServicos = servicos.filter(s => t.servicos_ids.includes(s.id));
                const totalValor = templateServicos.reduce((acc, s) => acc + calcularValor(s), 0);
                const totalHoras = templateServicos.reduce((acc, s) => acc + s.horas_estimadas, 0);

                return (
                  <div key={t.id} className="bg-[#1A1A1A] text-white p-6 rounded-[4px] border border-white/5 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[8px] uppercase tracking-widest text-bronze font-bold">TEMPLATE</p>
                        <h4 className="text-lg font-cormorant font-bold">{t.nome}</h4>
                      </div>
                      <p className="text-lg font-cormorant text-bronze font-bold">R$ {Math.round(totalValor).toLocaleString()}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Inclui:</p>
                      {templateServicos.map(s => (
                        <div key={s.id} className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-2">
                          <span className="text-white/70">✓ {s.nome}</span>
                          <span className="text-white/40">R$ {Math.round(calcularValor(s)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-end pt-2">
                      <div className="text-[10px] font-mono text-white/40">
                        <p>Total: R$ {Math.round(totalValor).toLocaleString()}</p>
                        <p>Horas estimadas: {totalHoras}h</p>
                      </div>
                      <Button className="h-9 bg-bronze hover:bg-bronze/90 text-white rounded-[2px] text-[9px] uppercase font-bold tracking-widest px-4">
                        Usar Template
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
