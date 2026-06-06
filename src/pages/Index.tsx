import React, { useState, useEffect } from 'react';
import { Lead, Stage, Temp, TipoProjeto, ConfigEscritorio, Origem } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

import KanbanColumn from '@/components/KanbanColumn';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  Settings2,
  Eye,
  Download,
  Users,
  X,
  TrendingUp,
  MapPin,
  Maximize2,
  Clock,
  LayoutGrid,
  Calendar,
  List,
  Zap,
  ArrowUpRight,
  ChevronUp,
  FileText
} from 'lucide-react';
import { parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  DragOverlay, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { toast } from "sonner";
import LeadCard from '@/components/LeadCard';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const STAGES: Stage[] = [
  'Novo Lead', 
  'Reunião Agendada', 
  'Briefing Preenchido',
  'Proposta Enviada', 
  'Negociação', 
  'Fechado', 
  'Perdido'
];

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TipoProjeto | 'Todos'>('Todos');
  const [filterTemp, setFilterTemp] = useState<Temp[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterResponsavel, setFilterResponsavel] = useState<'Todos' | 'Leandro' | 'Neandro'>('Todos');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista' | 'foco'>('kanban');
  const [smartFilter, setSmartFilter] = useState<'all' | 'ghosting' | 'score8' | 'premium' | 'high-ticket'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });
  const [config, setConfig] = useState<ConfigEscritorio | null>(null);

  // Project Conversion State
  const [showProjectConversion, setShowProjectConversion] = useState(false);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [conversionHours, setConversionHours] = useState({
    briefing: 20,
    conceito: 40,
    estudo: 80,
    executivo: 100,
    detalhamento: 60,
    acompanhamento: 40
  });
  const [conversionData, setConversionData] = useState({
    nome: '',
    cliente: '',
    tipo: '',
    cidade: '',
    area: 0,
    valor: 0
  });

  useEffect(() => {
    if (conversionLead) {
      setConversionData({
        nome: conversionLead.nome || '',
        cliente: conversionLead.nome || '',
        tipo: conversionLead.tipo || '',
        cidade: conversionLead.cidade || '',
        area: conversionLead.area || 0,
        valor: conversionLead.orcamento || 0
      });
    }
  }, [conversionLead]);

  const handleCreateProject = async () => {
    if (!conversionLead) return;
    
    try {
      const { data: project, error } = await supabase
        .from('projetos')
        .insert({
          nome: conversionData.nome,
          nome_cliente: conversionData.cliente,
          tipo: conversionData.tipo,
          cidade: conversionData.cidade,
          area_m2: conversionData.area,
          valor_total: conversionData.valor,
          status_geral: 'em_andamento',
          cliente_id: conversionLead.id,
          data_inicio: new Date().toISOString().split('T')[0],
          etapa_atual: 'Briefing'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Projeto criado a partir do lead.");
      setShowProjectConversion(false);
      navigate(`/projetos/detalhe/${project.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Erro ao criar projeto: ' + error.message);
    }
  };
  const criarPastasDropbox = async (nomeCliente: string, tipo: string) => {
    const pastaBase = `/NL Arquitetos/07 - Projetos NL OS/01 - Clientes/${nomeCliente} - ${tipo}`;
    
    const subpastas = [
      '01 - Briefing',
      '02 - Conceito', 
      '03 - Estudo Preliminar',
      '04 - Projeto Executivo',
      '05 - Detalhamento',
      '06 - Obra',
      '07 - Marketing',
      '08 - Contrato'
    ];

    try {
      console.log("Iniciando criação de pastas no Dropbox:", pastaBase);
      // Criar pasta principal
      const { error: mainFolderError } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'create_folder', path: pastaBase }
      });

      if (mainFolderError) {
        console.warn("Aviso ao criar pasta principal (pode já existir):", mainFolderError);
      }

      // Criar subpastas
      for (const subpasta of subpastas) {
        const { error: subFolderError } = await supabase.functions.invoke('dropbox-proxy', {
          body: { action: 'create_folder', path: `${pastaBase}/${subpasta}` }
        });
        if (subFolderError) {
          console.warn(`Aviso ao criar subpasta ${subpasta}:`, subFolderError);
        }
      }
      
      return pastaBase;
    } catch (error) {
      console.error("Erro fatal ao criar pastas no Dropbox:", error);
      throw error;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('config_escritorio').select('*').single();
      if (data) setConfig(data as ConfigEscritorio);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')?.[0] || 'User';
          setUser(name.charAt(0).toUpperCase() + name.slice(1));
          sessionStorage.setItem('nl_user', name.charAt(0).toUpperCase() + name.slice(1));
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')?.[0] || 'User';
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        setUser(formattedName);
        sessionStorage.setItem('nl_user', formattedName);
      } else {
        setUser(null);
        sessionStorage.removeItem('nl_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchLeads();

    // Realtime subscriptions
    const leadsChannel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_logs' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [session]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          logs:lead_logs(*)
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Map Supabase data to our Lead type
      const mappedLeads: Lead[] = (leadsData || []).map((l: any) => ({
        ...l,
        logs: (l.logs || []).sort((a: any, b: any) => 
          new Date(b.data).getTime() - new Date(a.data).getTime()
        )
      }));

      setLeads(mappedLeads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTempFilter = (temp: Temp) => {
    setFilterTemp(prev => 
      prev.includes(temp) ? prev.filter(t => t !== temp) : [...prev, temp]
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead;
    if (lead) setActiveLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'Lead') return;

    // Se estiver sobre uma coluna
    if (overData?.type === 'Column') {
      const overStage = overData.stage as Stage;
      const lead = leads.find(l => l.id === activeId);
      
      if (lead && lead.stage !== overStage) {
        const updateData = { 
          stage: overStage, 
          etapa_desde: new Date().toISOString(),
          fechado_em: overStage === 'Fechado' ? new Date().toISOString() : lead.fechado_em
        };

        const newLog = { 
          tipo: 'N' as const, 
          nota: `Movido para ${overStage}`, 
          data: new Date().toISOString(), 
          autor: user || 'Sistema' 
        };

        // Optimistic update
        setLeads(prev => prev.map(l => 
          l.id === activeId ? { 
            ...l, 
            ...updateData,
            logs: [newLog, ...l.logs]
          } : l
        ));

        // Background update
        Promise.all([
          supabase.from('leads').update(updateData).eq('id', activeId),
          supabase.from('lead_logs').insert({ ...newLog, lead_id: activeId })
        ]).then(() => {
          if (overStage === 'Fechado') {
            setConversionLead(lead);
            setShowProjectConversion(true);
          }
        }).catch(err => {
          console.error('Error updating stage:', err);
          toast.error('Erro ao salvar no banco');
          fetchLeads(); // Revert on error
        });
      }
      return;
    }

    // Se estiver sobre outro lead
    if (overData?.type === 'Lead') {
      const overLead = overData.lead as Lead;
      const activeLead = activeData.lead as Lead;
      
      if (activeLead.stage !== overLead.stage) {
        setLeads(prev => prev.map(l => 
          l.id === activeId ? { ...l, stage: overLead.stage, etapa_desde: new Date().toISOString() } : l
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    
    if (!over) return;
    
    if (active.id !== over.id) {
      const oldIndex = leads.findIndex(l => l.id === active.id);
      const newIndex = leads.findIndex(l => l.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setLeads(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
    
    const lead = leads.find(l => l.id === active.id);
    if (lead) {
      toast.success(`Lead atualizado`);
    }
  };

  const showMockToast = () => {
    const randomLead = leads[Math.floor(Math.random() * leads.length)];
    toast.custom((t) => (
      <div className="bg-[#1A1A1A] text-white p-4 rounded-[2px] shadow-2xl border-l-4 border-bronze flex items-center justify-between gap-4 min-w-[320px] animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bronze/10 rounded-full">
            <Eye size={18} className="text-bronze" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest">{randomLead.nome} abriu a proposta agora</p>
            <p className="text-[9px] text-white/50">Módulo Administrativo · Tracking em tempo real</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedLeadId(randomLead.id);
            toast.dismiss(t);
          }}
          className="text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white transition-colors"
        >
          Ver Lead
        </button>
      </div>
    ), { duration: 6000, position: 'bottom-right' });
  };

  const handleUpdateStage = async (leadId: string, newStage: Stage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updateData = { 
      stage: newStage, 
      etapa_desde: new Date().toISOString(),
      fechado_em: newStage === 'Fechado' ? new Date().toISOString() : lead.fechado_em
    };

    const newLog = { 
      tipo: 'N' as const, 
      nota: `Movido para ${newStage}`, 
      data: new Date().toISOString(), 
      autor: user || 'Sistema' 
    };

    // Optimistic update
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { 
        ...l, 
        ...updateData,
        logs: [newLog, ...l.logs]
      } : l
    ));

    try {
      const { error: updateError } = await supabase.from('leads').update(updateData).eq('id', leadId);
      if (updateError) throw updateError;
      
      const { error: logError } = await supabase.from('lead_logs').insert({ ...newLog, lead_id: leadId });
      if (logError) throw logError;
      
      toast.success(`Lead movido para ${newStage}`);

      // Se foi fechado, abre o modal de conversão
      if (newStage === 'Fechado') {
        setConversionLead(lead);
        setShowProjectConversion(true);
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error('Erro ao atualizar estágio');
      fetchLeads();
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLeadId(null);
      toast.success("Lead excluído com sucesso");
    } catch (err) {
      console.error('Error deleting lead:', err);
      toast.error('Erro ao excluir lead');
    }
  };

  const handleQuickNote = async (leadId: string, note: string) => {
    const log = {
      tipo: 'N' as const,
      nota: note,
      data: new Date().toISOString(),
      autor: user || 'Sistema'
    };
    
    try {
      const { data, error } = await supabase
        .from('lead_logs')
        .insert({ ...log, lead_id: leadId })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, logs: [data as any, ...l.logs] } : l
      ));
      toast.success("Interação registrada");
    } catch (err) {
      console.error('Error adding quick note:', err);
      toast.error('Erro ao registrar interação');
    }
  };

  const handleAddLog = async (leadId: string, log: any) => {
    try {
      const { data, error } = await supabase
        .from('lead_logs')
        .insert({ ...log, lead_id: leadId })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, logs: [data as any, ...l.logs] } : l
      ));
      toast.success("Contato registrado");
    } catch (err) {
      console.error('Error adding log:', err);
      toast.error('Erro ao registrar contato');
    }
  };


  const calculateLeadScore = (lead: Lead) => {
    let score = 0;
    const daysSinceLastContact = lead.logs.length > 0 ? differenceInDays(new Date(), parseISO(lead.logs[0].data)) : 0;
    
    if (lead.temp === 'Quente') score += 2;
    if (lead.temp === 'Morno') score += 1;
    if (lead.stage === 'Fechado') score += 10;
    if (lead.stage === 'Perdido') score += 0;
    
    return { score, daysSinceLastContact };
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || 
                          l.cidade.toLowerCase().includes(search.toLowerCase());
    const matchesType = l.isBriefingVirtual || filterType === 'Todos' || l.tipo === filterType;
    const matchesTemp = filterTemp.length === 0 || filterTemp.includes(l.temp);
    const matchesResponsavel = filterResponsavel === 'Todos' || l.criado_por === filterResponsavel;
    
    // Smart Filters Logic
    let matchesSmartFilter = true;
    if (smartFilter === 'ghosting') {
      const lastContact = l.logs.length > 0 ? new Date(l.logs[0].data) : new Date(l.criado);
      const daysSinceLastContact = differenceInDays(new Date(), lastContact);
      matchesSmartFilter = daysSinceLastContact > 3 && l.stage !== 'Fechado' && l.stage !== 'Perdido';
    } else if (smartFilter === 'score8') {
      const { score } = calculateLeadScore(l);
      matchesSmartFilter = score >= 8;
    } else if (smartFilter === 'high-ticket') {
      matchesSmartFilter = l.orcamento >= 500000;
    }

    return matchesSearch && matchesType && matchesTemp && matchesResponsavel && matchesSmartFilter;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Cores NL
    const graphite = [26, 26, 26]; // #1A1A1A
    const bronze = [139, 115, 85]; // #8B7355

    // Capa
    doc.setFillColor(graphite[0], graphite[1], graphite[2]);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Logo na Capa do PDF
    const logoUrl = "https://krzuroijejfozljhchok.supabase.co/storage/v1/object/public/assets/logo.png";
    // Adicionamos a logo com fundo transparente. No jsPDF, imagens remotas precisam ser carregadas ou convertidas.
    // Para simplificar e garantir funcionamento imediato, usaremos a URL direta se o jsPDF suportar ou apenas texto se falhar.
    try {
      doc.addImage(logoUrl, 'PNG', 65, 80, 80, 40); // Ajustado para ficar centralizado e maior no lugar do texto
    } catch (e) {
      console.error("Erro ao carregar logo no PDF:", e);
    }

    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.setFontSize(24);
    doc.text('Pipeline de Leads', 105, 130, { align: 'center' });
    
    doc.setTextColor(255, 255, 255, 0.5);
    doc.setFontSize(10);
    doc.text(`Gerado em ${dateStr} às ${timeStr}`, 105, 140, { align: 'center' });

    doc.addPage();
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);

    // Resumo Executivo
    doc.setFontSize(14);
    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.text('RESUMO EXECUTIVO', 14, 20);
    
    const activeLeads = filteredLeads.filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido').length;
    const totalValue = filteredLeads.reduce((acc, l) => acc + (l.orcamento || 0), 0);
    
    doc.setFontSize(10);
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.text(`Leads Ativos: ${activeLeads}`, 14, 30);
    doc.text(`Volume Total: R$ ${(totalValue / 1000).toLocaleString('pt-BR')}k`, 14, 35);

    // Tabela por Etapa
    let yPos = 45;
    STAGES.forEach(stage => {
      const stageLeads = filteredLeads.filter(l => l.stage === stage);
      if (stageLeads.length === 0) return;

      doc.setFontSize(12);
      doc.setTextColor(bronze[0], bronze[1], bronze[2]);
      doc.text(stage.toUpperCase(), 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Nome', 'Tipo', 'Cidade', 'Orçamento', 'Score', 'Dias']],
        body: stageLeads.map(l => [
          l.nome,
          l.tipo,
          l.cidade,
          `R$ ${(l.orcamento / 1000).toLocaleString('pt-BR')}k`,
          l.score,
          Math.floor((new Date().getTime() - new Date(l.etapa_desde).getTime()) / (1000 * 60 * 60 * 24))
        ]),
        headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Rodapé em todas as páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`NL Arquitetos · São José dos Campos · gerado em ${dateStr}`, 105, 285, { align: 'center' });
    }

    doc.save(`Pipeline_NL_OS_${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('Pipeline exportado com sucesso');
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar user={user} />
      
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] flex flex-col h-screen overflow-hidden">
        {/* Header Section */}


        {/* Header Section */}
        <div className="flex-shrink-0 bg-[#0A0A0A] z-10">
          <div className="px-10 py-6 border-b border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-cormorant text-white tracking-tight leading-none uppercase">Pipeline de Leads</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">Captação e conversão de clientes</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-bronze transition-colors" />
                <Input 
                  placeholder="BUSCAR LEAD..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 h-10 pl-10 bg-[#0A0A0A] border-white/10 focus:border-bronze focus:ring-0 rounded-[2px] text-[10px] tracking-widest uppercase"
                />
              </div>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportToPDF}
                  className="p-2 text-white/40 hover:text-bronze transition-colors"
                  title="Exportar Pipeline"
                >
                  <Download size={18} />
                </button>
                <div className="h-10 px-8 flex items-center gap-3 text-white/20 text-[9px] font-bold uppercase tracking-[0.2em] border border-white/5">
                  CRIAÇÃO VIA MÓDULO CLIENTES
                </div>
              </div>
            </div>
          </div>

          {/* MetricsBar and OriginBreakdown removed as per request - now in Command Center */}

          <div className="px-10 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-[2px]">
                {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={cn("px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px]", filterType === type ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white")}>{type}</button>
                ))}
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="relative group">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-bronze transition-colors" />
                <Input 
                  placeholder="BUSCAR..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 h-9 pl-9 bg-white/5 border-transparent focus:border-bronze focus:ring-0 rounded-[2px] text-[9px] tracking-widest uppercase"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                {(['kanban', 'lista', 'foco'] as const).map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setViewMode(mode)} 
                    className={cn(
                      "p-2 rounded-[2px] transition-colors",
                      viewMode === mode ? "text-bronze" : "text-white/20 hover:text-white"
                    )}
                    title={mode.toUpperCase()}
                  >
                    {mode === 'kanban' && <LayoutGrid size={14} />}
                    {mode === 'lista' && <List size={14} />}
                    {mode === 'foco' && <Zap size={14} />}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => navigate('/clientes')} 
                className="h-9 px-6 bg-bronze hover:bg-bronze/90 text-white text-[9px] font-bold uppercase tracking-widest transition-all rounded-[2px] flex items-center gap-2"
              >
                <Plus size={14} /> NOVO LEAD
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#0A0A0A] overflow-auto p-6 pt-2 scrollbar-custom">
          {viewMode === 'kanban' && (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToWindowEdges]}
            >
              <div className="grid grid-cols-7 h-full gap-4 min-w-[1400px]">
                {STAGES.map(stage => (
                  <KanbanColumn 
                    key={stage}
                    stage={stage}
                    leads={filteredLeads.filter(l => l.stage === stage)}
                    onLeadClick={(lead) => setSelectedLeadId(lead.id)}
                    onUpdateStatus={handleUpdateStage}
                          onQuickNote={handleQuickNote}
                          onViewFicha={(clienteId) => navigate(`/clientes/${clienteId}`)}
                        />
                ))}
              </div>

              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.4',
                    },
                  },
                }),
              }}>
                {activeLead ? (
                  <LeadCard 
                    lead={activeLead} 
                    index={0} 
                    onClick={() => {}} 
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {viewMode === 'lista' && (
            <div className="w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10">
                    {['NOME', 'ETAPA', 'TIPO', 'VALOR', 'SCORE', 'DIAS NA ETAPA', 'TEMPERATURA', 'AÇÕES'].map((header) => {
                      const key = header === 'NOME' ? 'nome' : 
                                  header === 'ETAPA' ? 'stage' : 
                                  header === 'VALOR' ? 'orcamento' : 
                                  header === 'SCORE' ? 'score' : 
                                  header === 'DIAS NA ETAPA' ? 'etapa_desde' : '';
                      return (
                        <th 
                          key={header}
                          onClick={() => {
                            if (!key) return;
                            setSortConfig(prev => ({
                              key,
                              direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
                            }));
                          }}
                          className="px-4 py-3 text-left text-[9px] text-white/40 uppercase tracking-widest font-bold cursor-pointer hover:text-white"
                        >
                          <div className="flex items-center gap-2">
                            {header}
                            {sortConfig.key === key && (
                              sortConfig.direction === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads
                    .sort((a, b) => {
                      if (!sortConfig.key) return 0;
                      const aVal = (a as any)[sortConfig.key];
                      const bVal = (b as any)[sortConfig.key];
                      if (sortConfig.key === 'etapa_desde') {
                        return sortConfig.direction === 'desc' 
                          ? new Date(bVal).getTime() - new Date(aVal).getTime()
                          : new Date(aVal).getTime() - new Date(bVal).getTime();
                      }
                      return sortConfig.direction === 'desc' 
                        ? (aVal < bVal ? 1 : -1)
                        : (aVal > bVal ? 1 : -1);
                    })
                    .map(lead => {
                      const daysInStage = Math.floor((new Date().getTime() - new Date(lead.etapa_desde).getTime()) / (1000 * 60 * 60 * 24));
                      const isAtiva = !['Fechado', 'Perdido'].includes(lead.stage);
                      return (
                        <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] h-14 transition-colors">
                          <td onClick={() => setSelectedLeadId(lead.id)} className="px-4 text-white text-sm font-medium cursor-pointer hover:text-bronze">{lead.nome}</td>
                          <td className="px-4">
                            <span className={cn(
                              "px-2 py-1 text-[8px] font-bold uppercase tracking-widest rounded-[2px]",
                              lead.stage === 'Fechado' ? "bg-green-500/10 text-green-500" : 
                              lead.stage === 'Perdido' ? "bg-red/10 text-red" : "bg-bronze/10 text-bronze"
                            )}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="px-4 text-white/60 text-xs">{lead.tipo}</td>
                          <td className="px-4 text-bronze text-sm font-bold">
                            {lead.orcamento > 0 ? `R$ ${(lead.orcamento / 1000).toLocaleString()}k` : "—"}
                          </td>
                          <td className="px-4">
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-full",
                              lead.score >= 8 ? "bg-bronze text-white" : 
                              lead.score >= 5 ? "bg-white/10 text-white" : "text-white/40"
                            )}>
                              {lead.score}
                            </span>
                          </td>
                          <td className={cn(
                            "px-4 text-xs",
                            daysInStage > 10 ? "text-red font-bold" : "text-white/60"
                          )}>
                            {daysInStage} dias
                          </td>
                          <td className="px-4">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                lead.temp === 'Quente' ? "bg-red animate-pulse" : 
                                lead.temp === 'Morno' ? "bg-amber" : "bg-white/40"
                              )} />
                              <span className="text-[10px] text-white/60 uppercase font-medium">{lead.temp}</span>
                            </div>
                          </td>
                          <td className="px-4">
                            <div className="flex items-center gap-3 text-white/40">
                              <button onClick={() => navigate('/scripts-atendimento', { state: { leadId: lead.id, leadNome: lead.nome } })} className="hover:text-bronze transition-colors"><FileText size={14} /></button>
                              <button onClick={() => setSelectedLeadId(lead.id)} className="hover:text-bronze transition-colors"><ArrowUpRight size={14} /></button>
                              <button onClick={() => handleQuickNote(lead.id, "Ação rápida registrada via lista")} className="hover:text-bronze transition-colors"><Zap size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'foco' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {(() => {
                const now = new Date();
                const focusLeads = filteredLeads
                  .filter(l => !['Fechado', 'Perdido'].includes(l.stage))
                  .map(l => {
                    let urgency = 0;
                    let badge = "";
                    let color = "border-white/10";
                    
                    const isAtrasado = l.proxima_acao_data && isBefore(parseISO(l.proxima_acao_data), startOfDay(now));
                    const isQuenteSemContato = l.temp === 'Quente' && differenceInDays(now, parseISO(l.logs[0]?.data || l.criado)) > 7;
                    const isReuniaoProxima = l.stage === 'Reunião Agendada' && l.proxima_acao_data && 
                                            differenceInDays(parseISO(l.proxima_acao_data), now) <= 2 &&
                                            differenceInDays(parseISO(l.proxima_acao_data), now) >= 0;

                    if (isAtrasado) {
                      urgency = 10;
                      badge = "ATRASADO";
                      color = "border-red";
                    } else if (isQuenteSemContato) {
                      urgency = 8;
                      badge = "ATENÇÃO";
                      color = "border-amber";
                    } else if (isReuniaoProxima) {
                      urgency = 9;
                      badge = "PREPARAR";
                      color = "border-bronze";
                    }

                    return { ...l, focusScore: urgency, focusBadge: badge, focusColor: color };
                  });

                const prioritized = focusLeads.filter(l => l.focusScore > 0).sort((a, b) => b.focusScore - a.focusScore);
                const regular = focusLeads.filter(l => l.focusScore === 0).sort((a, b) => b.score - a.score);

                return (
                  <>
                    <div className="space-y-4">
                      {prioritized.map(lead => (
                        <div key={lead.id} className={cn("bg-white/[0.03] border-l-4 p-6 flex items-center justify-between group", lead.focusColor)}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] rounded-[1px]",
                                lead.focusBadge === 'ATRASADO' ? "bg-red text-white" :
                                lead.focusBadge === 'ATENÇÃO' ? "bg-amber text-white" : "bg-bronze text-white"
                              )}>
                                {lead.focusBadge}
                              </span>
                              <h3 className="text-white font-medium text-lg">{lead.nome}</h3>
                              <span className="text-white/40 text-xs">· {lead.tipo} · R$ {(lead.orcamento / 1000).toLocaleString()}k · Score {lead.score}</span>
                            </div>
                            <p className="text-white/40 text-xs italic">
                              {lead.proxima_acao_nota || `Em ${lead.stage} há ${differenceInDays(now, parseISO(lead.etapa_desde))} dias`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/scripts-atendimento', { state: { leadId: lead.id, leadNome: lead.nome } })} className="h-9 px-4 bg-white/5 hover:bg-bronze text-white text-[9px] font-bold uppercase tracking-widest transition-all rounded-none">ABRIR SCRIPT</button>
                            <button onClick={() => handleQuickNote(lead.id, "Contato registrado via modo foco")} className="h-9 px-4 bg-white/5 hover:bg-bronze text-white text-[9px] font-bold uppercase tracking-widest transition-all rounded-none">REGISTRAR CONTATO</button>
                            <button onClick={() => setSelectedLeadId(lead.id)} className="h-9 px-4 border border-white/10 hover:border-white text-white/60 hover:text-white text-[9px] font-bold uppercase tracking-widest transition-all rounded-none">VER LEAD</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {regular.length > 0 && (
                      <div className="pt-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-[1px] flex-1 bg-white/10" />
                          <h2 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Demais Leads Ativos</h2>
                          <div className="h-[1px] flex-1 bg-white/10" />
                        </div>
                        <div className="space-y-3">
                          {regular.map(lead => (
                            <div key={lead.id} className="bg-white/[0.01] border-l-4 border-white/5 p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                              <div className="flex items-center gap-4">
                                <span className="text-white font-medium">{lead.nome}</span>
                                <span className="text-white/30 text-[10px] uppercase tracking-widest">{lead.stage}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setSelectedLeadId(lead.id)} className="text-[9px] font-bold text-white/40 hover:text-bronze uppercase tracking-widest transition-colors">VER DETALHES</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {selectedLead && (
        <LeadDetailPanel 
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onUpdateStage={handleUpdateStage}
          onDelete={handleDeleteLead}
          onAddLog={handleAddLog}
        />
      )}

      {/* Project Conversion Modal */}
      <Dialog open={showProjectConversion} onOpenChange={setShowProjectConversion}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-md">
          <div className="p-8">
            <h2 className="text-2xl font-cormorant font-bold mb-1">Converter em Projeto?</h2>
            <p className="text-[11px] text-white/60 mb-8 font-mono">{conversionLead?.nome} acabou de ser fechado. Deseja criar o projeto no Controle de Horas?</p>
            
            <div className="space-y-6">
              <div className="p-4 bg-white/5 border border-white/10 rounded-none space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">Resumo do Lead</p>
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="text-white/50 block text-[9px] uppercase">Nome</span>
                    {conversionLead?.nome}
                  </div>
                  <div>
                    <span className="text-white/50 block text-[9px] uppercase">Cliente</span>
                    {conversionLead?.nome}
                  </div>
                  <div>
                    <span className="text-white/50 block text-[9px] uppercase">Tipo</span>
                    {conversionLead?.tipo} · {conversionLead?.area}m²
                  </div>
                  <div>
                    <span className="text-white/50 block text-[9px] uppercase">Valor</span>
                    R$ {conversionLead?.orcamento?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/60">Horas Estimadas</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { id: 'briefing', label: 'Briefing' },
                    { id: 'conceito', label: 'Conceito' },
                    { id: 'estudo', label: 'Estudo' },
                    { id: 'executivo', label: 'Executivo' },
                    { id: 'detalhamento', label: 'Detalhamento' },
                    { id: 'acompanhamento', label: 'Acompanhamento' },
                  ].map(h => (
                    <div key={h.id}>
                      <label className="text-[9px] uppercase text-white/50 block mb-1.5">{h.label}</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={(conversionHours as any)[h.id]}
                          onChange={(e) => setConversionHours({...conversionHours, [h.id]: Number(e.target.value)})}
                          className="bg-white/5 border-white/10 text-white rounded-none h-9 text-xs"
                        />
                        <span className="text-[9px] text-white/50 uppercase">h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setShowProjectConversion(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/60 hover:text-white">Agora não</Button>
                <Button 
                  onClick={async () => {
                    if (!conversionLead) return;
                    try {
                      console.log("Iniciando conversão de lead em projeto:", conversionLead);
                      toast.loading("Configurando projeto e pastas no Dropbox...", { id: "create-project" });
                      
                      const tokenCliente = crypto.randomUUID();
                      let dropboxFolder = "";
                      
                      try {
                        dropboxFolder = await criarPastasDropbox(conversionLead.nome, conversionLead.tipo);
                      } catch (dbErr: any) {
                        console.error("Erro no Dropbox durante conversão:", dbErr);
                        // Se falhou o Dropbox, continuamos para criar o projeto mas avisaremos no final
                      }

                      const tipoStr = (conversionLead.tipo as string) || '';
                      const tipoMapeado = (tipoStr === 'ARQ+INT' || tipoStr === 'arq' || tipoStr === 'Arq+Int' || !tipoStr)
                        ? 'Arq+Int'
                        : (tipoStr === 'INT' || tipoStr === 'Interiores')
                        ? 'Interiores'
                        : 'Comercial';

                      const projetoData = {
                        nome: conversionLead.nome,
                        nome_cliente: conversionLead.nome,
                        cliente_id: conversionLead.id,
                        tipo: tipoMapeado,
                        area_m2: conversionLead.area,
                        valor_proposta: conversionLead.orcamento,
                        valor_total: conversionLead.orcamento,
                        horas_estimadas: (conversionHours.briefing || 0) + (conversionHours.conceito || 0) + (conversionHours.estudo || 0) + (conversionHours.executivo || 0) + (conversionHours.detalhamento || 0) + (conversionHours.acompanhamento || 0),
                        horas_briefing: conversionHours.briefing,
                        horas_conceito: conversionHours.conceito,
                        horas_anteprojeto: conversionHours.estudo,
                        horas_executivo: conversionHours.executivo,
                        horas_detalhamento: conversionHours.detalhamento,
                        horas_acompanhamento: conversionHours.acompanhamento,
                        status_geral: 'ativo',
                        etapa_atual: 'Briefing',
                        token_cliente: tokenCliente,
                        dropbox_folder: dropboxFolder || null
                      };

                      console.log("Dados do projeto a serem inseridos:", projetoData);

                      const { error } = await supabase.from('projetos').insert(projetoData);

                      if (error) {
                        console.error("Erro ao inserir projeto no Supabase:", error);
                        throw error;
                      }

                      if (dropboxFolder) {
                        toast.success("Projeto criado e pastas no Dropbox configuradas!", { id: "create-project" });
                      } else {
                        toast.error("Projeto criado. Pastas no Dropbox não foram criadas — verifique os logs ou sincronize manualmente.", { 
                          id: "create-project",
                          duration: 6000 
                        });
                      }

                      setShowProjectConversion(false);
                      fetchLeads();
                    } catch (err: any) {
                      console.error("Erro detalhado na conversão:", err);
                      toast.error(`Erro ao converter lead em projeto: ${err.message || "Erro desconhecido"}`, { id: "create-project" });
                    }
                  }}
                  className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-12 text-[10px] uppercase font-bold tracking-widest"
                >
                  Criar Projeto
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Conversion Dialog */}
      <Dialog open={showProjectConversion} onOpenChange={setShowProjectConversion}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cormorant text-2xl italic">Converter em Projeto</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Nome do Projeto</Label>
              <Input 
                id="nome" 
                value={conversionData.nome} 
                onChange={(e) => setConversionData(prev => ({ ...prev, nome: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cliente" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Cliente</Label>
              <Input 
                id="cliente" 
                value={conversionData.cliente} 
                onChange={(e) => setConversionData(prev => ({ ...prev, cliente: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Tipo</Label>
                <Input 
                  id="tipo" 
                  value={conversionData.tipo} 
                  onChange={(e) => setConversionData(prev => ({ ...prev, tipo: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cidade" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Cidade</Label>
                <Input 
                  id="cidade" 
                  value={conversionData.cidade} 
                  onChange={(e) => setConversionData(prev => ({ ...prev, cidade: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="area" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Área m²</Label>
                <Input 
                  id="area" 
                  type="number"
                  value={conversionData.area} 
                  onChange={(e) => setConversionData(prev => ({ ...prev, area: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor" className="text-[10px] uppercase tracking-widest text-[#8B7355]">Valor Total</Label>
                <Input 
                  id="valor" 
                  type="number"
                  value={conversionData.valor} 
                  onChange={(e) => setConversionData(prev => ({ ...prev, valor: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowProjectConversion(false)}
              className="border-white/10 hover:bg-white/5 text-[10px] uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateProject}
              className="bg-[#8B7355] hover:bg-[#7a654a] text-[10px] uppercase tracking-widest"
            >
              CRIAR PROJETO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
