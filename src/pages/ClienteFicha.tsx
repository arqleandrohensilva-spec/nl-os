import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, History, User, Phone, Pencil, Save, Clock, Copy, ExternalLink, Check, Calendar, Plus, Eye, Calculator, ChevronDown, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateContractDocx, generateContractPDF, getContractPreviewHtml } from '@/lib/generateContract';
import { ContractData } from '@/utils/contractTemplates';
import { valorPorExtenso } from '@/utils/extenso';
import { Progress } from '@/components/ui/progress';

const ORIGENS = ['Instagram', 'Indicação', 'Site', 'Outro'];

const ETAPAS = [
  { id: 'ficha', label: 'FICHA' },
  { id: 'pre_briefing', label: 'PRÉ-BRIEFING' },
  { id: 'reuniao', label: 'REUNIÃO' },
  { id: 'proposta', label: 'PROPOSTA' },
  { id: 'contrato', label: 'CONTRATO' }
];

const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['ficha']);
  const [isNewClient, setIsNewClient] = useState(!id);
  
  useEffect(() => {
    setIsNewClient(!id);
    if (!id) {
      setIsEditing(true);
      setFormData({
        nome: '',
        whatsapp: '',
        email: '',
        cpf_cnpj: '',
        cidade: '',
        endereco_imovel: '',
        origem: 'Instagram',
        observacoes: '',
        imovel_definido: '',
        tipo_projeto: '',
        area_m2: '',
        orcamento: '',
        prazo: '',
        quem_decide: '',
        anotacoes_reuniao: '',
        data_reuniao: '',
        checklist_reuniao: [],
        reuniao_data: '',
        reuniao_local: 'Presencial',
        reuniao_link: '',
        reuniao_notas: ''
      });
    }
  }, [id]);
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cpf_cnpj: '',
    cidade: '',
    endereco_imovel: '',
    origem: 'Instagram',
    observacoes: '',
    imovel_definido: '',
    tipo_projeto: '',
    area_m2: '',
    orcamento: '',
    prazo: '',
    quem_decide: '',
    anotacoes_reuniao: '',
    data_reuniao: '',
    checklist_reuniao: [] as string[],
    reuniao_data: '',
    reuniao_local: 'Presencial',
    reuniao_link: '',
    reuniao_notas: ''
  });
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { data: cliente, isLoading: isClienteLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: historico } = useQuery({
    queryKey: ['historico_cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_clientes')
        .select('*')
        .eq('cliente_id', id)
        .order('data_hora', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: briefing } = useQuery({
    queryKey: ['briefing_cliente', id, cliente?.whatsapp],
    queryFn: async () => {
      // Primeiro tenta por cliente_id
      const { data: porId } = await supabase
        .from('briefings')
        .select('*')
        .eq('cliente_id', id)
        .maybeSingle();
      
      if (porId) return porId;
      
      // Se não encontrou, tenta pelo whatsapp
      if (cliente?.whatsapp) {
        const { data: porWhats } = await supabase
          .from('briefings')
          .select('*')
          .eq('whatsapp', cliente.whatsapp)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return porWhats;
      }
      
      return null;
    },
    enabled: !!id && !!cliente
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ['propostas_cliente', id, cliente?.nome],
    queryFn: async () => {
      const query = supabase
        .from('proposals')
        .select(`
          *,
          proposal_views (
            viewed_at,
            tempo_segundos,
            secoes_tempo
          )
        `)
        .order('created_at', { ascending: true });

      if (id) {
        // First try by cliente_id, then fallback to name if no results found via OR or separate logic
        const { data, error } = await query.or(`cliente_id.eq.${id},cliente.eq."${cliente?.nome}"`);
        if (error) throw error;
        return data || [];
      }
      return [];
    },
    enabled: !!id && !!cliente?.nome
  });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProposalForProject, setSelectedProposalForProject] = useState<any>(null);
  const [openProposalId, setOpenProposalId] = useState<string | null>(null);
  const [selectedProposals, setSelectedProposals] = useState<string[]>([]);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    nacionalidade: 'brasileiro(a)',
    estadoCivil: 'Solteiro(a)',
    profissao: '',
    prazoTotal: '12',
    matricula: '',
    cartorio: '',
    plano: 'Executivo' as 'Executivo' | 'Completo',
    areaTerreno: '',
    areaConstruida: '',
    valorTotal: '',
    marco1: '',
    marco2: '',
    marco3: ''
  });
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingContractPreview] = useState(false);

  const proposta = propostas[propostas.length - 1] || null;

  const { data: contrato } = useQuery({
    queryKey: ['contrato_cliente', id],
    queryFn: async () => {
      if (!id) return null;
      // Using raw query to avoid complex type instantiation depth issue in this specific view
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', id)
        .eq('status', 'Gerado')
        .maybeSingle();
      if (error) console.error("Error fetching contract:", error);
      return data;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        nome: cliente.nome || '',
        whatsapp: cliente.whatsapp || '',
        email: cliente.email || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        cidade: cliente.cidade || '',
        endereco_imovel: cliente.endereco_imovel || '',
        origem: cliente.origem || 'Instagram',
        observacoes: cliente.observacoes || '',
        imovel_definido: cliente.imovel_definido || '',
        tipo_projeto: cliente.tipo_projeto || '',
        area_m2: cliente.area_m2?.toString() || '',
        orcamento: cliente.orcamento || '',
        prazo: cliente.prazo || '',
        quem_decide: cliente.quem_decide || '',
        reuniao_data: cliente.reuniao_data || '',
        reuniao_local: cliente.reuniao_local || 'Presencial',
        reuniao_link: cliente.reuniao_link || '',
        reuniao_notas: cliente.reuniao_notas || ''
      }));
      if (cliente.etapa_fluxo) {
        setOpenSections([cliente.etapa_fluxo]);
      }
    }
  }, [cliente]);

  const updateEtapa = async (novaEtapa: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ etapa_fluxo: novaEtapa } as any)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Avançado para etapa: ${novaEtapa.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      setOpenSections([novaEtapa]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar etapa");
    }
  };

  const handleCreateProject = async () => {
    if (!cliente || !id) return;
    try {
      // 1. Marcar como assinado
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ 
          contrato_assinado: true, 
          contrato_assinado_em: new Date().toISOString(),
          etapa_fluxo: 'projeto'
        } as any)
        .eq('id', id);
      
      if (updateError) throw updateError;

      // 2. Criar projeto
      const { data: novoProjeto, error: projectError } = await supabase.from('projetos').insert({
        nome: `Projeto ${cliente.nome}`,
        nome_cliente: cliente.nome,
        tipo: cliente.tipo_projeto || 'Arq+Int',
        cidade: cliente.cidade,
        area_m2: parseFloat(cliente.area_m2 as any) || 0,
        etapa_atual: 'Briefing',
        status_geral: 'ativo',
        data_inicio: new Date().toISOString().split('T')[0],
        cliente_id: id
      }).select().single();

      if (projectError) throw projectError;

      // 3. Criar etapas padrão
      const etapasPadrao = [
        { etapa: 'Briefing', status: 'concluido' },
        { etapa: 'Estudo Preliminar', status: 'em_andamento' },
        { etapa: 'Anteprojeto', status: 'pendente' },
        { etapa: 'Executivo', status: 'pendente' }
      ];

      for (let i = 0; i < etapasPadrao.length; i++) {
        await supabase.from('projeto_etapas').insert({
          projeto_id: novoProjeto.id,
          etapa: etapasPadrao[i].etapa,
          status: etapasPadrao[i].status
        });
      }

      toast.success(`Projeto criado — ${cliente.nome}`);
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      
      // Mostrar botão ver projeto no final da etapa 5
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar projeto");
    }
  };

  const currentStepIndex = ETAPAS.findIndex(e => e.id === (cliente?.etapa_fluxo || 'ficha'));

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
    );
  };

  const calcularScore = (dados: any) => {
    let score = 0;
    if (dados.imovel_definido === 'Sim, definido') score += 2;
    else if (dados.imovel_definido === 'Em busca') score += 1;
    if (dados.tipo_projeto === 'ARQ+INT') score += 2;
    else if (['Interiores', 'Comercial'].includes(dados.tipo_projeto)) score += 1;
    if (Number(dados.area_m2) >= 200) score += 1;
    if (dados.orcamento === 'Acima R$700k') score += 3;
    else if (dados.orcamento === 'R$300-700k') score += 1;
    if (dados.prazo === 'Imediato') score += 2;
    else if (dados.prazo === '6 meses') score += 1;
    if (dados.quem_decide === 'Sozinho') score += 2;
    else if (dados.quem_decide === 'Com cônjuge') score += 1;
    if (dados.origem === 'Indicação') score += 3;
    else if (dados.origem === 'Google') score += 2;
    else if (dados.origem === 'Instagram') score += 1;
    return score;
  };

  const score = calcularScore(formData);
  const temp = score >= 9 ? 'Quente' : score >= 5 ? 'Morno' : 'Frio';

  const updateQualificacao = useCallback(async (key: string, value: any) => {
    if (!id) return;
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    const newScore = calcularScore(newFormData);
    const newTemp = newScore >= 9 ? 'Quente' : newScore >= 5 ? 'Morno' : 'Frio';

    const updateValue = key === 'area_m2' ? Number(value) : value;
    await supabase.from('clientes').update({ [key]: updateValue } as any).eq('id', id);
    await supabase.from('leads').update({ score: newScore, temp: newTemp }).eq('cliente_id', id);
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
  }, [formData, id, queryClient]);
  
  const handleGenerateContract = async (formatType: 'docx' | 'pdf') => {
    if (isGeneratingContract) return;
    setIsGeneratingContract(true);
    try {
      // 1. Buscar propostas selecionadas
      const { data: props, error: propError } = await supabase
        .from('proposals')
        .select('*, calculos_proposta (*)')
        .in('id', selectedProposals);

      if (propError) throw propError;
      if (!props || props.length === 0) {
        toast.error("Selecione ao menos uma proposta");
        return;
      }

      // 2. Gerar número do contrato
      const year = new Date().getFullYear();
      const { data: lastContract } = await supabase
        .from('contratos')
        .select('numero')
        .order('criado_em', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastContract && lastContract[0]?.numero) {
        const match = lastContract[0].numero.match(/NL-\d{4}-(\d{3})/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const numeroContrato = `NL-${year}-${String(nextNumber).padStart(3, '0')}`;

      // 3. Somar valores conforme o plano
      let totalValue = 0;
      props.forEach(p => {
        const c = p.calculos_proposta?.[0];
        if (contractFormData.plano === 'Executivo') {
          totalValue += Number(c?.valor_executivo || p.valor_executivo || 0);
        } else {
          totalValue += Number(c?.valor_completo || p.valor_completo || 0);
        }
      });

      const lastProp = props[props.length - 1];

      // 4. Montar dados para o contrato
      const contractData: ContractData = {
        numero: numeroContrato,
        cliente: {
          nome: formData.nome || cliente?.nome || '',
          cpf: cliente?.cpf_cnpj || '',
          endereco: cliente?.endereco_imovel || cliente?.cidade || '',
          nacionalidade: contractFormData.nacionalidade,
          estadoCivil: contractFormData.estadoCivil,
          profissao: contractFormData.profissao
        },
        projeto: {
          tipo: lastProp.tipo === 'ArqInt' ? 'ARQ+INT' : 
                lastProp.tipo === 'Interiores' ? 'Interiores' : 'Comercial',
          plano: contractFormData.plano,
          endereco: cliente?.endereco_imovel || cliente?.cidade || '',
          tipoImovel: 'Residência',
          areaTerreno: contractFormData.areaTerreno || '',
          areaConstruida: contractFormData.areaConstruida || lastProp.area?.toString() || '',
          matricula: contractFormData.matricula,
          cartorio: contractFormData.cartorio
        },
        prazos: {
          briefing: '5',
          estudo: '15',
          legal: '10',
          executivo: '30',
          total: contractFormData.prazoTotal,
          totalDias: '65'
        },
        honorarios: {
          totalExecutivo: totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          totalCompleto: totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          totalExtenso: valorPorExtenso(totalValue),
          marco1: (totalValue * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          marco2: (totalValue * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          marco3: (totalValue * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        },
        nl: {
          cauLeandro: 'A203598-7',
          cauNeandro: 'A203599-5',
          cpfNeandro: '000.000.000-00'
        },
        dataAssinatura: new Date().toLocaleDateString('pt-BR')
      };

      // 5. Gerar arquivo
      let blob;
      if (formatType === 'docx') {
        blob = await generateContractDocx(contractData);
      } else {
        blob = await generateContractPDF(contractData);
      }
      
      if (!blob) return;

      // 6. Salvar no Banco
      const { error: dbError } = await supabase.from('contratos').insert({
        numero: numeroContrato,
        cliente_id: cliente?.id,
        lead_id: null,
        cliente_nome: contractData.cliente.nome,
        tipo: contractData.projeto.tipo,
        plano: contractData.projeto.plano,
        dados_gerais: contractData.cliente as any,
        prazos: contractData.prazos as any,
        valores: contractData.honorarios as any,
        status: 'Gerado'
      });

      if (dbError) throw dbError;

      // 7. Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${numeroContrato} - ${contractData.cliente.nome}.${formatType}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Contrato (${formatType.toUpperCase()}) gerado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['contrato_cliente', id] });
      setIsGeneratingContract(false);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      toast.error(`Erro ao gerar contrato: ${err.message || 'Erro desconhecido'}`);
      setIsGeneratingContract(false);
    }
  };

  const handleShowPreview = async () => {
    try {
      setIsGeneratingContractPreview(true);
      
      const { data: props } = await supabase
        .from('proposals')
        .select('*, calculos_proposta (*)')
        .in('id', selectedProposals);

      if (!props || props.length === 0) {
        toast.error("Selecione ao menos uma proposta");
        return;
      }

      const year = new Date().getFullYear();
      const { data: lastContract } = await supabase
        .from('contratos')
        .select('numero')
        .order('criado_em', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastContract?.[0]?.numero) {
        const match = lastContract[0].numero.match(/NL-\d{4}-(\d{3})/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const numeroContrato = `NL-${year}-${String(nextNumber).padStart(3, '0')}`;

      let totalValue = 0;
      props.forEach(p => {
        const c = p.calculos_proposta?.[0];
        if (contractFormData.plano === 'Executivo') {
          totalValue += Number(c?.valor_executivo || p.valor_executivo || 0);
        } else {
          totalValue += Number(c?.valor_completo || p.valor_completo || 0);
        }
      });

      const lastProp = props[props.length - 1];

      const contractData: ContractData = {
        numero: numeroContrato,
        cliente: {
          nome: formData.nome || cliente?.nome || '',
          cpf: cliente?.cpf_cnpj || '',
          endereco: cliente?.endereco_imovel || cliente?.cidade || '',
          nacionalidade: contractFormData.nacionalidade,
          estadoCivil: contractFormData.estadoCivil,
          profissao: contractFormData.profissao
        },
        projeto: {
          tipo: lastProp.tipo === 'ArqInt' ? 'ARQ+INT' : 
                lastProp.tipo === 'Interiores' ? 'Interiores' : 'Comercial',
          plano: contractFormData.plano,
          endereco: cliente?.endereco_imovel || cliente?.cidade || '',
          tipoImovel: 'Residência',
          areaTerreno: contractFormData.areaTerreno || '',
          areaConstruida: contractFormData.areaConstruida || lastProp.area?.toString() || '',
          matricula: contractFormData.matricula,
          cartorio: contractFormData.cartorio
        },
        prazos: {
          briefing: '5',
          estudo: '15',
          legal: '10',
          executivo: '30',
          total: contractFormData.prazoTotal,
          totalDias: '65'
        },
        honorarios: {
          totalExecutivo: totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          totalCompleto: totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          totalExtenso: valorPorExtenso(totalValue),
          marco1: (totalValue * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          marco2: (totalValue * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          marco3: (totalValue * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        },
        nl: {
          cauLeandro: 'A203598-7',
          cauNeandro: 'A203599-5',
          cpfNeandro: '000.000.000-00'
        },
        dataAssinatura: new Date().toLocaleDateString('pt-BR')
      };

      const html = await getContractPreviewHtml(contractData);
      if (html) {
        setPreviewHtml(html);
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar preview");
    } finally {
      setIsGeneratingContractPreview(false);
    }
  };



  if (isClienteLoading) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0D0D0D] text-[#E8E4DF]">
      <Sidebar user="User" />
      
      <main className="flex-1 ml-[230px] p-12 max-w-6xl mx-auto space-y-12">
        {/* CABEÇALHO EM DESTAQUE */}
        <div className="space-y-4">
          <h1 className="text-6xl font-['Cormorant_Garamond'] italic text-[#E8E4DF] leading-none uppercase tracking-tighter">
            {id ? cliente?.nome : 'Novo Cliente'}
          </h1>
          <div className="flex items-center gap-4 text-white/30 text-[10px] font-['Courier_New'] uppercase tracking-[0.3em] font-bold">
            <span>{cliente?.cidade}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span>{cliente?.origem}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span className="text-[#8B7355]">{cliente?.tipo_projeto || 'ARQ+INT'}</span>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div className="bg-[#161616] p-8 border border-white/5 relative">
          <div className="flex justify-between items-center relative z-10">
            {ETAPAS.map((etapa, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={etapa.id} className="flex flex-col items-center gap-2 flex-1">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-500",
                    isCompleted ? "bg-[#8B7355] border-[#8B7355]" : 
                    isCurrent ? "bg-[#8B7355] border-[#8B7355] animate-pulse" : 
                    "bg-transparent border-[#2A2A2A]"
                  )} />
                  <span className={cn(
                    "text-[8px] font-['Courier_New'] font-bold tracking-[0.2em]",
                    isCompleted || isCurrent ? "text-[#8B7355]" : "text-white/20"
                  )}>
                    {etapa.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-[40px] left-[10%] right-[10%] h-px bg-[#2A2A2A]" />
          <div 
            className="absolute top-[40px] left-[10%] h-px bg-[#8B7355] transition-all duration-700" 
            style={{ width: `${(currentStepIndex / (ETAPAS.length - 1)) * 80}%` }}
          />
        </div>

        {/* ETAPA 1 - FICHA */}
        <section className="bg-[#161616] border border-white/5 overflow-hidden">
          <div 
            onClick={() => toggleSection('ficha')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 1 — FICHA DO CLIENTE</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('ficha') ? 'Fechar' : 'Abrir'}</span>
          </div>
          
          {openSections.includes('ficha') && (
            <div className="p-8 space-y-10">
              <div className="flex justify-between items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1">
                  {[
                    { label: 'Nome', key: 'nome' },
                    { label: 'WhatsApp', key: 'whatsapp' },
                    { label: 'E-mail', key: 'email' },
                    { label: 'CPF/CNPJ', key: 'cpf_cnpj' },
                    { label: 'Cidade', key: 'cidade' },
                    { label: 'Endereço', key: 'endereco_imovel', fullWidth: true },
                    { label: 'Origem', key: 'origem' },
                  ].map((field) => (
                    <div key={field.key} className={cn("space-y-1", field.fullWidth && "md:col-span-2 lg:col-span-3")}>
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                      {isEditing ? (
                        <Input 
                          value={formData[field.key as keyof typeof formData]} 
                          onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                          className="bg-white/5 border-white/10 rounded-none h-8 text-xs uppercase"
                        />
                      ) : (
                        <p className="text-[#E8E4DF] text-sm uppercase font-medium">{formData[field.key as keyof typeof formData] || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
                {!id && (
                  <Button 
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.from('clientes').insert({
                          nome: formData.nome,
                          whatsapp: formData.whatsapp,
                          email: formData.email,
                          cpf_cnpj: formData.cpf_cnpj,
                          cidade: formData.cidade,
                          endereco_imovel: formData.endereco_imovel,
                          origem: formData.origem,
                          etapa_fluxo: 'ficha'
                        }).select().single();
                        
                        if (error) throw error;
                        
                        toast.success("Cliente criado com sucesso!");
                        navigate(`/clientes/${data.id}`);
                      } catch (err) {
                        toast.error("Erro ao criar cliente");
                      }
                    }}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 ml-8 font-['Courier_New'] text-xs font-bold uppercase tracking-widest h-12"
                  >
                    SALVAR CLIENTE
                  </Button>
                )}
                {id && (
                  <Button 
                    onClick={async () => {
                      if (isEditing) {
                        try {
                          const { error } = await supabase.from('clientes').update({
                            nome: formData.nome,
                            whatsapp: formData.whatsapp,
                            email: formData.email,
                            cpf_cnpj: formData.cpf_cnpj,
                            cidade: formData.cidade,
                            endereco_imovel: formData.endereco_imovel,
                            origem: formData.origem
                          }).eq('id', id);
                          if (error) throw error;
                          toast.success("Dados atualizados!");
                          setIsEditing(false);
                          queryClient.invalidateQueries({ queryKey: ['cliente', id] });
                        } catch (err) {
                          toast.error("Erro ao atualizar");
                        }
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    variant="ghost"
                    className="bg-transparent border border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-[#0D0D0D] rounded-none px-6 ml-8 font-['Courier_New'] text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    {isEditing ? 'SALVAR' : 'EDITAR'}
                  </Button>
                )}
              </div>

              {/* QUALIFICAÇÃO BLOCO */}
              <div className="bg-[#0D0D0D] border border-white/5 p-6 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-[#8B7355] font-bold tracking-widest uppercase font-['Courier_New']">Score de Qualificação</span>
                  <span className="text-lg font-medium text-[#8B7355]">{score}/15 — {temp}</span>
                </div>
                <Progress value={(score / 15) * 100} indicatorClassName={cn(
                  "transition-all duration-500",
                  temp === 'Frio' ? 'bg-[#333]' : temp === 'Morno' ? 'bg-[#8B7355]' : 'bg-[#8B7355]'
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Tem imóvel/lote definido?', key: 'imovel_definido', options: ['Sim, definido', 'Em busca', 'Não'] },
                    { label: 'Tipo de projeto', key: 'tipo_projeto', options: ['ARQ+INT', 'Interiores', 'Comercial'] },
                    { label: 'Área estimada (m²)', key: 'area_m2', isNumeric: true },
                    { label: 'Orçamento estimado', key: 'orcamento', options: ['Acima R$700k', 'R$300-700k', 'Abaixo', 'Não sei'] },
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                      {field.isNumeric ? (
                        <Input 
                          type="number"
                          value={formData[field.key as keyof typeof formData]} 
                          onChange={(e) => updateQualificacao(field.key, e.target.value)}
                          className="bg-white/5 border-white/10 rounded-none h-9 text-xs"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {field.options?.map(opt => (
                            <button
                              key={opt}
                              onClick={() => updateQualificacao(field.key, opt)}
                              className={cn(
                                "px-3 py-1.5 text-[9px] uppercase border transition-all",
                                formData[field.key as keyof typeof formData] === opt
                                  ? "bg-[#8B7355] border-[#8B7355] text-white"
                                  : "bg-transparent border-[#2A2A2A] text-white/40 hover:border-[#8B7355]"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => updateEtapa('pre_briefing')}
                  className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                >
                  ENVIAR PRÉ-BRIEFING →
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ETAPA 2 - PRÉ-BRIEFING */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 1 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 1 && toggleSection('pre_briefing')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 2 — PRÉ-BRIEFING</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('pre_briefing') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('pre_briefing') && (
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Link para envio</Label>
                <div className="flex gap-2">
                  <Input readOnly value="app.nl.arq.br/pre-briefing" className="bg-[#0D0D0D] border-white/5 text-white/60 text-xs rounded-none" />
                  <Button 
                    variant="outline" 
                    className="border-[#8B7355] text-[#8B7355] bg-transparent hover:bg-[#8B7355] hover:text-[#0D0D0D] rounded-none text-[10px] uppercase transition-colors" 
                    onClick={() => {
                      navigator.clipboard.writeText("https://app.nl.arq.br/pre-briefing");
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy size={14} className="mr-2" /> COPIAR
                  </Button>
                  <Button 
                    className="bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-green-600/20 rounded-none text-[10px] uppercase"
                    onClick={() => {
                      const msg = `Olá ${cliente?.nome}, aqui é da NL Arquitetos. Para iniciarmos seu projeto, precisamos que preencha nosso pré-briefing: https://app.nl.arq.br/pre-briefing`;
                      window.open(`https://wa.me/55${cliente?.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                  >
                    WHATSAPP
                  </Button>
                </div>
              </div>

              <div className="p-6 bg-[#0D0D0D] border border-white/5">
                <div 
                  onClick={() => briefing && setIsBriefingOpen(!isBriefingOpen)}
                  className={cn(
                    "flex items-center justify-between",
                    briefing ? "cursor-pointer group" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", briefing ? "bg-green-500" : "bg-yellow-500")} />
                    <span className="text-[10px] uppercase font-bold tracking-widest font-['Courier_New'] text-white/60">
                      {briefing ? 'BRIEFING PREENCHIDO ✓' : 'AGUARDANDO PREENCHIMENTO'}
                    </span>
                  </div>
                  {briefing && (
                    <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-200", isBriefingOpen ? "rotate-0" : "-rotate-90")} />
                  )}
                </div>
                
                {briefing && (
                  <div className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    isBriefingOpen ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-6">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Tipo de Projeto</span>
                          <p className="text-xs font-medium uppercase">{briefing.tipo_projeto || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Área estimada</span>
                          <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.area_estimada || '—'} m²</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Orçamento</span>
                          <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.orcamento || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Prazo</span>
                          <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.prazo || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Estilo</span>
                          <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.estilo || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Imóvel</span>
                          <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.imovel || '—'}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Observações</span>
                          <p className="text-xs font-medium uppercase whitespace-pre-wrap">{(briefing.respostas as any)?.observacoes || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentStepIndex === 1 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => updateEtapa('reuniao')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    AGENDAR REUNIÃO →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 3 - REUNIÃO */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 2 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 2 && toggleSection('reuniao')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 3 — REUNIÃO</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('reuniao') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('reuniao') && (
            <div className="p-8 space-y-8">
              {!cliente?.reuniao_data || isRescheduling ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Data e Horário</Label>
                      <Input 
                        type="datetime-local" 
                        value={formData.reuniao_data ? formData.reuniao_data.slice(0, 16) : ''}
                        onChange={(e) => setFormData({...formData, reuniao_data: e.target.value})}
                        className="bg-[#0D0D0D] border-white/5 rounded-none" 
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Local</Label>
                      <div className="flex gap-6 mt-2">
                        {['Presencial', 'Online'].map(loc => (
                          <label key={loc} className="flex items-center gap-2 cursor-pointer group">
                            <div 
                              onClick={() => setFormData({...formData, reuniao_local: loc})}
                              className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                formData.reuniao_local === loc ? "border-[#8B7355] bg-[#8B7355]" : "border-white/20 group-hover:border-[#8B7355]/50"
                              )}
                            >
                              {formData.reuniao_local === loc && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-[10px] uppercase text-white/60 font-bold tracking-widest font-['Courier_New']">
                              {loc === 'Online' ? 'Online (Google Meet / Zoom)' : loc}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formData.reuniao_local === 'Online' && (
                    <div className="space-y-4">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Link da Reunião</Label>
                      <Input 
                        value={formData.reuniao_link}
                        onChange={(e) => setFormData({...formData, reuniao_link: e.target.value})}
                        placeholder="HTTPS://MEET.GOOGLE.COM/..."
                        className="bg-[#0D0D0D] border-white/5 rounded-none text-xs uppercase" 
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Observações Internas</Label>
                    <textarea 
                      value={formData.reuniao_notas}
                      onChange={(e) => setFormData({...formData, reuniao_notas: e.target.value})}
                      className="w-full h-32 bg-[#0D0D0D] border border-white/5 p-4 text-xs uppercase text-white/60 outline-none focus:border-[#8B7355]" 
                      placeholder="PONTOS IMPORTANTES DA REUNIÃO..." 
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    {isRescheduling && (
                      <Button 
                        variant="outline"
                        onClick={() => setIsRescheduling(false)}
                        className="border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-[#0D0D0D] rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                      >
                        CANCELAR
                      </Button>
                    )}
                    <Button 
                      onClick={async () => {
                        if (!id) return;
                        try {
                          // Se for reagendamento, salvar no histórico
                          if (cliente?.reuniao_data && isRescheduling) {
                            const dataAnterior = format(new Date(cliente.reuniao_data), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
                            const novaData = format(new Date(formData.reuniao_data), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
                            
                            await supabase.from('historico_clientes').insert({
                              cliente_id: id,
                              tipo: 'reagendamento',
                              descricao: `Apresentação reagendada de ${dataAnterior} para ${novaData}`,
                              data_hora: new Date().toISOString()
                            } as any);
                          }

                          const { error } = await supabase
                            .from('clientes')
                            .update({
                              reuniao_data: formData.reuniao_data,
                              reuniao_local: formData.reuniao_local,
                              reuniao_link: formData.reuniao_link,
                              reuniao_notas: formData.reuniao_notas
                            } as any)
                            .eq('id', id);
                          
                          if (error) throw error;
                          
                          toast.success("Agendamento salvo com sucesso!");
                          setIsRescheduling(false);
                          queryClient.invalidateQueries({ queryKey: ['cliente', id] });
                          queryClient.invalidateQueries({ queryKey: ['historico_cliente', id] });
                        } catch (err) {
                          toast.error("Erro ao salvar agendamento");
                        }
                      }}
                      className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                    >
                      SALVAR AGENDAMENTO
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* CARD DE CONFIRMAÇÃO */}
                  <div className="p-8 bg-[#0D0D0D] border border-[#8B7355]/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Calendar size={80} className="text-[#8B7355]" />
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Check size={12} className="text-green-500" />
                        </div>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-[0.2em] font-['Courier_New']">APRESENTAÇÃO AGENDADA</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/30 font-['Courier_New']">Data e Horário</span>
                          <p className="text-lg font-medium text-[#E8E4DF] uppercase">
                            {format(new Date(cliente.reuniao_data), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase text-white/30 font-['Courier_New']">Local</span>
                          <p className="text-lg font-medium text-[#E8E4DF] uppercase">
                            {cliente.reuniao_local}
                            {cliente.reuniao_link && (
                              <a 
                                href={cliente.reuniao_link.startsWith('http') ? cliente.reuniao_link : `https://${cliente.reuniao_link}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block text-[10px] text-[#8B7355] underline mt-1 font-['Courier_New']"
                              >
                                ACESSAR LINK DA REUNIÃO
                              </a>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button 
                          variant="outline"
                          onClick={() => setIsRescheduling(true)}
                          className="border-[#8B7355]/30 text-[#8B7355] hover:bg-[#8B7355]/10 rounded-none px-8 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                        >
                          REAGENDAR
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* HISTÓRICO DE REAGENDAMENTOS */}
                  {historico?.some((h: any) => h.tipo === 'reagendamento') && (
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] uppercase text-white/30 font-bold tracking-[0.2em] font-['Courier_New'] whitespace-nowrap">HISTÓRICO DE AGENDAMENTOS</span>
                        <div className="h-px bg-white/5 flex-1" />
                      </div>
                      <div className="space-y-3">
                        {historico
                          .filter((h: any) => h.tipo === 'reagendamento')
                          .map((h: any) => (
                            <div key={h.id} className="flex items-start gap-3 text-[10px] font-['Courier_New'] text-white/40 uppercase tracking-tight">
                              <History size={12} className="mt-0.5 text-[#8B7355]/50" />
                              <p>
                                Reagendado em {format(new Date(h.data_hora), "dd/MM")} — {h.descricao}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {currentStepIndex === 2 && (
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => {
                          updateEtapa('proposta');
                          navigate('/calculadora/nova-proposta', { 
                            state: { 
                              clienteId: id,
                              clienteNome: formData.nome || cliente?.nome,
                              clienteCidade: formData.cidade || cliente?.cidade,
                              clienteTipo: formData.tipo_projeto || cliente?.tipo_projeto,
                              clienteArea: formData.area_m2 || cliente?.area_m2
                            } 
                          });
                        }}
                        className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                      >
                        GERAR PROPOSTA →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 4 - PROPOSTA */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 3 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 3 && toggleSection('proposta')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 4 — PROPOSTA</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('proposta') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('proposta') && (
            <div className="p-8 space-y-8">
              {!proposta ? (
                <div className="text-center py-10 border border-dashed border-white/5 bg-[#0D0D0D]">
                  <p className="text-[10px] uppercase text-white/20 font-['Courier_New'] mb-6">Nenhuma proposta vinculada a este cliente</p>
                  <Button 
                    onClick={() => navigate('/calculadora/nova-proposta', { 
                      state: { 
                        clienteId: id,
                        clienteNome: formData.nome || cliente?.nome,
                        clienteCidade: formData.cidade || cliente?.cidade,
                        clienteTipo: formData.tipo_projeto || cliente?.tipo_projeto,
                        clienteArea: formData.area_m2 || cliente?.area_m2
                      } 
                    })}
                    className="bg-[#8B7355] text-white rounded-none px-8 text-[10px] font-bold uppercase"
                  >
                    CALCULAR PROPOSTA
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-[#0D0D0D] border border-white/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase text-[#8B7355] font-bold tracking-widest font-['Courier_New']">PROPOSTAS E TRACKING</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {propostas.map((p, idx) => {
                      const views = p.proposal_views || [];
                      const viewsCount = views.length;
                      const lastView = views.length > 0 
                        ? views.sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())[0].viewed_at 
                        : null;
                      
                      const timeSinceLastView = lastView 
                        ? format(new Date(lastView), "HH:mm 'de' dd/MM", { locale: ptBR })
                        : null;

                      const isOpen = openProposalId === p.id;

                      return (
                        <div 
                          key={p.id} 
                          className={cn(
                            "bg-white/[0.02] border transition-all duration-200 overflow-hidden",
                            isOpen ? "border-[#8B7355]" : "border-[#2A2A2A]"
                          )}
                        >
                          {/* HEADER (FECHADO) */}
                          <div 
                            className="p-4 flex justify-between items-center hover:bg-white/[0.04]"
                          >
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setOpenProposalId(isOpen ? null : p.id)}>
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProposals(prev => 
                                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                  );
                                }}
                                className={cn(
                                  "w-4 h-4 border flex items-center justify-center transition-colors",
                                  selectedProposals.includes(p.id) ? "bg-[#8B7355] border-[#8B7355]" : "border-white/20"
                                )}
                              >
                                {selectedProposals.includes(p.id) && <Check size={10} className="text-white" />}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-tight">
                                    {p.cliente} — {p.tipo}
                                  </span>
                                  <Badge variant="outline" className="text-[7px] border-white/10 text-white/40 h-4 px-1">V{idx + 1}</Badge>
                                </div>
                                <p className="text-[9px] text-white/30 font-mono tracking-tighter mt-0.5">
                                  {p.link_proposta || 'Sem link gerado'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                                p.status === 'Aprovada' ? "bg-green-500/10 text-green-500" : "bg-[#8B7355]/10 text-[#8B7355]"
                              )}>
                                {p.status || 'Enviada'}
                              </div>
                              <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-200", isOpen && "rotate-180")} />
                            </div>
                          </div>

                          {/* BODY (ABERTO) */}
                          <div className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}>
                            <div className="overflow-hidden">
                              <div className="px-4 pb-6 pt-2 space-y-4">
                                <div className="flex flex-col gap-4 py-3 border-y border-white/5">
                                  <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                      <Eye size={12} className="text-[#8B7355]" />
                                      <span className="text-[10px] text-white/60 uppercase tracking-widest">
                                        {viewsCount > 0 ? `Vista ${viewsCount} ${viewsCount === 1 ? 'vez' : 'vezes'}` : 'Ainda não aberta'}
                                      </span>
                                    </div>
                                    
                                    {viewsCount > 0 && views[0].tempo_segundos && (
                                      <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-[#8B7355]" />
                                        <span className="text-[10px] text-white/60 uppercase tracking-widest">
                                          {Math.floor(views[0].tempo_segundos / 60)} min {views[0].tempo_segundos % 60}s
                                        </span>
                                      </div>
                                    )}

                                    {timeSinceLastView && (
                                      <div className="flex items-center gap-2">
                                        <Calendar size={12} className="text-[#8B7355]" />
                                        <span className="text-[10px] text-white/60 uppercase tracking-widest">
                                          Última: {timeSinceLastView}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Tracking de Seções */}
                                  {viewsCount > 0 && views[0].secoes_tempo && Object.keys(views[0].secoes_tempo).length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <div className="h-px bg-white/5 w-full" />
                                      {Object.entries(views[0].secoes_tempo as Record<string, number>)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([secao, tempo]) => {
                                          const maxTempo = Math.max(...Object.values(views[0].secoes_tempo as Record<string, number>));
                                          const porcentagem = (tempo / maxTempo) * 100;
                                          const label = secao.replace('secao-', '').charAt(0).toUpperCase() + secao.replace('secao-', '').slice(1);
                                          
                                          return (
                                            <div key={secao} className="space-y-1">
                                              <div className="flex justify-between items-center text-[9px] font-['Courier_New'] uppercase tracking-tight">
                                                <span className="text-white/40">{label}</span>
                                                <span className="text-[#8B7355]">{tempo}s</span>
                                              </div>
                                              <div className="h-1 bg-white/5 w-full overflow-hidden">
                                                <div 
                                                  className="h-full bg-[#8B7355] transition-all duration-500"
                                                  style={{ width: `${porcentagem}%` }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 border-white/10 bg-transparent text-white/40 hover:text-white hover:bg-white/5 rounded-none text-[9px] uppercase tracking-widest font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (p.link_proposta) {
                                          navigator.clipboard.writeText(p.link_proposta);
                                          toast.success("Link copiado!");
                                        }
                                      }}
                                    >
                                      <Copy size={12} className="mr-2" /> COPIAR LINK
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 border-[#8B7355]/30 bg-transparent text-[#8B7355] hover:bg-[#8B7355]/10 rounded-none text-[9px] uppercase tracking-widest font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/calculadora/${p.id}`);
                                      }}
                                    >
                                      <Calculator size={12} className="mr-2" /> CALCULAR
                                    </Button>
                                    {p.link_proposta && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-8 text-[#8B7355] hover:text-[#F0EDE8] rounded-none text-[9px] uppercase tracking-widest flex items-center gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(p.link_proposta, '_blank');
                                        }}
                                      >
                                        <ExternalLink size={12} /> ABRIR
                                      </Button>
                                    )}
                                  </div>

                                  <Select 
                                    value={p.status || 'Enviada'} 
                                    onValueChange={async (newStatus) => {
                                      try {
                                        const { error } = await supabase
                                          .from('proposals')
                                          .update({ status: newStatus })
                                          .eq('id', p.id);
                                        if (error) throw error;
                                        toast.success(`Status da V${idx + 1} atualizado para ${newStatus}`);
                                        queryClient.invalidateQueries({ queryKey: ['propostas_cliente'] });
                                        
                                        if (newStatus === 'Aprovada') {
                                          setSelectedProposalForProject(p);
                                          setIsProjectModalOpen(true);
                                        }
                                      } catch (err) {
                                        toast.error("Erro ao atualizar status");
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-[9px] uppercase tracking-widest bg-[#1E1E1E] border border-white/10 text-[#F0EDE8] font-bold rounded-none focus:ring-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1E1E1E] border-white/10">
                                      <SelectItem value="Enviada" className="text-[#F0EDE8] text-[9px] uppercase focus:bg-[#2A2A2A] focus:text-[#F0EDE8] cursor-pointer">Enviada</SelectItem>
                                      <SelectItem value="Vista" className="text-[#F0EDE8] text-[9px] uppercase focus:bg-[#2A2A2A] focus:text-[#F0EDE8] cursor-pointer">Vista</SelectItem>
                                      <SelectItem value="Aprovada" className="text-[#F0EDE8] text-[9px] uppercase focus:bg-[#2A2A2A] focus:text-[#F0EDE8] cursor-pointer">Aprovada</SelectItem>
                                      <SelectItem value="Recusada" className="text-[#F0EDE8] text-[9px] uppercase focus:bg-[#2A2A2A] focus:text-[#F0EDE8] cursor-pointer">Recusada</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Button 
                      variant="ghost" 
                      className="w-full border border-dashed border-white/10 text-white/20 hover:text-[#8B7355] hover:border-[#8B7355]/50 hover:bg-[#8B7355]/5 rounded-none text-[10px] uppercase tracking-widest font-['Courier_New'] font-bold h-12"
                      onClick={() => navigate('/calculadora/nova-proposta', { 
                        state: { 
                          clienteId: id,
                          clienteNome: formData.nome || cliente?.nome,
                          clienteCidade: formData.cidade || cliente?.cidade,
                          clienteTipo: formData.tipo_projeto || cliente?.tipo_projeto,
                          clienteArea: formData.area_m2 || cliente?.area_m2,
                          versao: propostas.length + 1
                        } 
                      })}
                    >
                      + CRIAR NOVA VERSÃO DA PROPOSTA
                    </Button>
                  </div>
                </div>
              )}

              {currentStepIndex === 3 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => updateEtapa('contrato')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    GERAR CONTRATO →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 5 - CONTRATO */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 4 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 4 && toggleSection('contrato')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 5 — CONTRATO</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('contrato') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('contrato') && (
            <div className="p-8 space-y-8">
              {!contrato ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* BLOCO 1 - Dados Automáticos (Read-only) */}
                    <div className="space-y-6 bg-[#0D0D0D] p-6 border border-white/5">
                      <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.2em] font-bold border-b border-white/5 pb-2">BLOCO 1 — DADOS AUTOMÁTICOS</h3>
                      
                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">NOME</Label>
                          <p className="text-xs uppercase text-white/80">{formData.nome || cliente?.nome || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">CPF</Label>
                          <p className="text-xs uppercase text-white/80">{cliente?.cpf_cnpj || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ENDEREÇO</Label>
                          <p className="text-xs uppercase text-white/80">{cliente?.endereco_imovel || cliente?.cidade || '-'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">TIPO PROJETO</Label>
                            <p className="text-xs uppercase text-white/80">{cliente?.tipo_projeto || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ÁREA</Label>
                            <p className="text-xs uppercase text-white/80">{cliente?.area_m2 || '-'} M²</p>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">PLANO SELECIONADO</Label>
                            <Select 
                              value={contractFormData.plano} 
                              onValueChange={(v: any) => setContractFormData({...contractFormData, plano: v})}
                            >
                              <SelectTrigger className="w-32 bg-[#1E1E1E] text-[#F0EDE8] border-[#3A3A3A] text-xs h-8 rounded-none">
                                <SelectValue placeholder="PLANO" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1E1E1E] border-[#3A3A3A] text-[#F0EDE8]">
                                <SelectItem value="Executivo" className="focus:bg-[#8B7355] focus:text-white">EXECUTIVO</SelectItem>
                                <SelectItem value="Completo" className="focus:bg-[#8B7355] focus:text-white">COMPLETO</SelectItem>
                                <SelectItem value="Fornecedor" className="focus:bg-[#8B7355] focus:text-white">FORNECEDOR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {(() => {
                            // Cálculo dinâmico para visualização baseada na proposta selecionada
                            let val = 0;
                            if (selectedProposals.length > 0) {
                              const props = (propostas as any[]).filter(p => selectedProposals.includes(p.id));
                              props.forEach(p => {
                                const c = p.calculos_proposta?.[0];
                                if (contractFormData.plano === 'Executivo') {
                                  val += Number(c?.valor_executivo || p.valor_executivo || 0);
                                } else {
                                  val += Number(c?.valor_completo || p.valor_completo || 0);
                                }
                              });
                            }
                            
                            return (
                              <div className="space-y-2 bg-white/5 p-3 mt-2">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-white/40 uppercase font-bold tracking-widest">VALOR TOTAL</span>
                                  <span className="text-[#8B7355] font-bold">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-[10px] border-t border-white/5 pt-2">
                                  <span className="text-white/40 uppercase tracking-widest">MARCO 1 (30%)</span>
                                  <span className="text-white/60">R$ {(val * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-white/40 uppercase tracking-widest">MARCO 2 (40%)</span>
                                  <span className="text-white/60">R$ {(val * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-white/40 uppercase tracking-widest">MARCO 3 (30%)</span>
                                  <span className="text-white/60">R$ {(val * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 2 - Campos que faltam (Editáveis) */}
                    <div className="space-y-6 bg-[#0D0D0D] p-6 border border-white/5">
                      <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.2em] font-bold border-b border-white/5 pb-2">BLOCO 2 — CAMPOS QUE FALTAM</h3>
                      
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">NACIONALIDADE</Label>
                            <Input 
                              value={contractFormData.nacionalidade}
                              onChange={(e) => setContractFormData({...contractFormData, nacionalidade: e.target.value})}
                              className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355] uppercase"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ESTADO CIVIL</Label>
                            <Select 
                              value={contractFormData.estadoCivil}
                              onValueChange={(v) => setContractFormData({...contractFormData, estadoCivil: v})}
                            >
                              <SelectTrigger className="bg-transparent border-white/10 text-xs h-9 rounded-none">
                                <SelectValue placeholder="SELECIONE" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#161616] border-white/10">
                                <SelectItem value="Solteiro(a)">SOLTEIRO(A)</SelectItem>
                                <SelectItem value="Casado(a)">CASADO(A)</SelectItem>
                                <SelectItem value="Divorciado(a)">DIVORCIADO(A)</SelectItem>
                                <SelectItem value="Viúvo(a)">VIÚVO(A)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">PROFISSÃO</Label>
                          <Input 
                            value={contractFormData.profissao}
                            onChange={(e) => setContractFormData({...contractFormData, profissao: e.target.value})}
                            className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355] uppercase"
                          />
                        </div>

                        {/* Área do Terreno — opcional */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ÁREA DO TERRENO (M²)</Label>
                            <button
                              type="button"
                              onClick={() => setContractFormData({...contractFormData, areaTerreno: contractFormData.areaTerreno === null ? '' : null})}
                              className="text-[8px] uppercase tracking-widest text-white/20 hover:text-[#8B7355] transition-colors"
                            >
                              {contractFormData.areaTerreno === null ? '+ INCLUIR' : '— NÃO SE APLICA'}
                            </button>
                          </div>
                          {contractFormData.areaTerreno !== null && (
                            <Input
                              value={contractFormData.areaTerreno || ''}
                              onChange={(e) => setContractFormData({...contractFormData, areaTerreno: e.target.value})}
                              placeholder="Ex: 450"
                              className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355]"
                            />
                          )}
                          {contractFormData.areaTerreno === null && (
                            <p className="text-[9px] text-white/20 italic">Não será incluído no contrato</p>
                          )}
                        </div>

                        {/* Área Construída — opcional */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ÁREA CONSTRUÍDA / INTERVENÇÃO (M²)</Label>
                            <button
                              type="button"
                              onClick={() => setContractFormData({...contractFormData, areaConstruida: contractFormData.areaConstruida === null ? '' : null})}
                              className="text-[8px] uppercase tracking-widest text-white/20 hover:text-[#8B7355] transition-colors"
                            >
                              {contractFormData.areaConstruida === null ? '+ INCLUIR' : '— NÃO SE APLICA'}
                            </button>
                          </div>
                          {contractFormData.areaConstruida !== null && (
                            <Input
                              value={contractFormData.areaConstruida || ''}
                              onChange={(e) => setContractFormData({...contractFormData, areaConstruida: e.target.value})}
                              placeholder="Ex: 280"
                              className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355]"
                            />
                          )}
                          {contractFormData.areaConstruida === null && (
                            <p className="text-[9px] text-white/20 italic">Não será incluído no contrato</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">PRAZO TOTAL (SEMANAS)</Label>
                            <Input 
                              type="number"
                              value={contractFormData.prazoTotal}
                              onChange={(e) => setContractFormData({...contractFormData, prazoTotal: e.target.value})}
                              className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">MATRÍCULA</Label>
                            <Input 
                              value={contractFormData.matricula}
                              onChange={(e) => setContractFormData({...contractFormData, matricula: e.target.value})}
                              placeholder="OPCIONAL"
                              className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355] uppercase"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">CARTÓRIO</Label>
                          <Input 
                            value={contractFormData.cartorio}
                            onChange={(e) => setContractFormData({...contractFormData, cartorio: e.target.value})}
                            placeholder="OPCIONAL"
                            className="bg-transparent border-white/10 text-xs h-9 rounded-none focus-visible:ring-1 focus-visible:ring-[#8B7355] uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pré-visualização de Tags */}
                  <div className="bg-[#1A1816] border border-white/5 p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <Info size={14} className="text-bronze" />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Resumo de Substituição (Tags)</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{nome_cliente}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">{formData.nome || cliente?.nome || '—'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{cpf_cliente}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">{cliente?.cpf_cnpj || '—'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{valor_total}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">
                          R$ {(() => {
                            let val = 0;
                            if (selectedProposals.length > 0) {
                              const props = (propostas as any[]).filter(p => selectedProposals.includes(p.id));
                              props.forEach(p => {
                                const c = p.calculos_proposta?.[0];
                                val += contractFormData.plano === 'Completo' ? Number(c?.valor_completo || p.valor_completo || 0) : Number(c?.valor_executivo || p.valor_executivo || 0);
                              });
                            }
                            return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{plano_selecionado}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">{contractFormData.plano}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{prazo_semanas}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">{contractFormData.prazoTotal} SEMANAS</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-tighter">{`{data_contrato}`}</p>
                        <p className="text-[10px] text-bronze uppercase truncate font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className="text-[8px] text-white/10 italic text-center pt-2 border-t border-white/[0.02]">
                      Os campos acima serão inseridos automaticamente no template DOCX/PDF
                    </p>
                  </div>

                  <div className="flex justify-center pt-4">
                    <div className="flex gap-4 pt-4">
                      <Button 
                        disabled={isGeneratingContract || isGeneratingPreview || selectedProposals.length === 0}
                        onClick={handleShowPreview}
                        className="bg-transparent border border-white/10 text-white hover:bg-white/5 rounded-none px-6 text-[10px] font-bold uppercase h-12 tracking-widest flex-1"
                      >
                        {isGeneratingPreview ? <Loader2 className="animate-spin mr-2" /> : null}
                        PRÉ-VISUALIZAR
                      </Button>
                      <Button 
                        disabled={isGeneratingContract || selectedProposals.length === 0}

                        onClick={() => handleGenerateContract('docx')}
                        className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-6 text-[10px] font-bold uppercase h-12 tracking-widest flex-1"
                      >
                        {isGeneratingContract ? <Loader2 className="animate-spin mr-2" /> : null}
                        GERAR DOCX
                      </Button>

                      <Button 
                        disabled={isGeneratingContract || selectedProposals.length === 0}
                        onClick={() => handleGenerateContract('pdf')}
                        className="bg-transparent border border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-white rounded-none px-6 text-[10px] font-bold uppercase h-12 tracking-widest flex-1"
                      >
                        {isGeneratingContract ? <Loader2 className="animate-spin mr-2" /> : null}
                        GERAR PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#0D0D0D] border border-white/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase text-[#8B7355] font-bold tracking-widest font-['Courier_New']">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</span>
                      <p className="text-xs uppercase mt-1">{contrato.numero}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 text-[9px] font-bold uppercase tracking-widest",
                      cliente?.contrato_assinado ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {cliente?.contrato_assinado ? 'ASSINADO ✓' : 'AGUARDANDO ASSINATURA'}
                    </div>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm('Deseja realmente inativar este contrato para gerar um novo?')) {
                          try {
                            const { error } = await supabase
                              .from('contratos')
                              .update({ status: 'Inativo' } as any)
                              .eq('id', contrato.id);
                            
                            if (error) throw error;
                            
                            await supabase
                              .from('clientes')
                              .update({ contrato_assinado: false } as any)
                              .eq('id', id);

                            toast.success("Contrato inativado");
                            queryClient.invalidateQueries({ queryKey: ['contrato_cliente', id] });
                            queryClient.invalidateQueries({ queryKey: ['cliente', id] });
                          } catch (error) {
                            console.error(error);
                            toast.error("Erro ao inativar contrato");
                          }
                        }
                      }}
                      className="text-[9px] text-white/20 hover:text-red-500 uppercase tracking-widest font-bold h-auto p-0"
                    >
                      Inativar
                    </Button>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        const dadosGerais = contrato.dados_gerais as any;
                        const data = {
                          numero: contrato.numero,
                          cliente: dadosGerais,
                          projeto: {
                            tipo: contrato.tipo,
                            plano: contrato.plano,
                            endereco: dadosGerais?.endereco || '',
                            tipoImovel: 'Residência',
                            areaTerreno: '',
                            areaConstruida: '',
                            matricula: '',
                            cartorio: ''
                          },
                          prazos: contrato.prazos as any,
                          honorarios: contrato.valores as any,
                          nl: {
                            cauLeandro: 'A203598-7',
                            cauNeandro: 'A203599-5',
                            cpfNeandro: '000.000.000-00'
                          },
                          dataAssinatura: (contrato as any).data_assinatura || format(new Date(), 'dd/MM/yyyy')
                        };
                        const blob = await generateContractDocx(data);
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${contrato.numero} - ${contrato.cliente_nome}.docx`;
                          a.click();
                        }
                      }}
                      className="bg-transparent border border-white/10 text-white hover:bg-white/5 rounded-none px-6 text-[10px] font-bold uppercase h-10 tracking-widest flex-1"
                    >
                      DOWNLOAD DOCX
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        const dadosGerais = contrato.dados_gerais as any;
                        const data = {
                          numero: contrato.numero,
                          cliente: dadosGerais,
                          projeto: {
                            tipo: contrato.tipo,
                            plano: contrato.plano,
                            endereco: dadosGerais?.endereco || '',
                            tipoImovel: 'Residência',
                            areaTerreno: '',
                            areaConstruida: '',
                            matricula: '',
                            cartorio: ''
                          },
                          prazos: contrato.prazos as any,
                          honorarios: contrato.valores as any,
                          nl: {
                            cauLeandro: 'A203598-7',
                            cauNeandro: 'A203599-5',
                            cpfNeandro: '000.000.000-00'
                          },
                          dataAssinatura: (contrato as any).data_assinatura || format(new Date(), 'dd/MM/yyyy')
                        };
                        const blob = await generateContractPDF(data);
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${contrato.numero} - ${contrato.cliente_nome}.pdf`;
                          a.click();
                        }
                      }}
                      className="bg-transparent border border-white/10 text-white hover:bg-white/5 rounded-none px-6 text-[10px] font-bold uppercase h-10 tracking-widest flex-1"
                    >
                      DOWNLOAD PDF
                    </Button>
                  </div>


                  
                  {!cliente?.contrato_assinado ? (
                    <Button 
                      onClick={handleCreateProject}
                      className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 text-[10px] font-bold uppercase"
                    >
                      MARCAR COMO ASSINADO
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">ASSINADO EM {format(new Date(cliente.contrato_assinado_em), 'dd/MM/yyyy')}</p>
                      <Button 
                        onClick={() => navigate('/projetos/gestao')}
                        className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 text-[10px] font-bold uppercase"
                      >
                        VER PROJETO →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ANOTAÇÕES INTERNAS E HISTÓRICO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <section className="space-y-4">
            <Label className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ANOTAÇÕES INTERNAS</Label>
            <textarea 
              value={formData.observacoes} 
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              onBlur={() => supabase.from('clientes').update({ observacoes: formData.observacoes }).eq('id', id)}
              placeholder="DIGITE AQUI..."
              className="w-full h-40 bg-[#161616] border border-white/5 p-6 text-[#E8E4DF] text-xs outline-none focus:border-[#8B7355] transition-colors resize-none uppercase"
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <History size={16} className="text-[#8B7355]" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B7355] font-['Courier_New']">HISTÓRICO</h2>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {!historico || historico.length === 0 ? (
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-['Courier_New']">Nenhuma alteração registrada</p>
              ) : (
                historico.map((h) => (
                  <div key={h.id} className="flex gap-4 items-start relative pb-4 border-b border-white/5 last:border-0">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#8B7355] shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/60 font-['Courier_New'] uppercase tracking-widest leading-relaxed">
                        Alterado de <span className="text-white/40">{h.status_anterior || 'INICIAL'}</span> para <span className="text-white font-bold">{h.status_novo}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-bold">
                        <Clock size={10} />
                        {format(new Date(h.data_hora), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        {/* MODAL PARA CRIAR PROJETO QUANDO APROVADO */}
        <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
          <DialogContent className="bg-[#161616] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-cormorant font-bold uppercase tracking-widest text-[#8B7355]">
                PROPOSTA APROVADA!
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <p className="text-sm text-white/60 leading-relaxed uppercase tracking-wide">
                Deseja criar o projeto automaticamente para <span className="text-[#8B7355] font-bold">{cliente?.nome}</span>?
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">PROPOSTA SELECIONADA</p>
                <p className="text-xs font-bold uppercase">{selectedProposalForProject?.cliente} — {selectedProposalForProject?.tipo}</p>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-white/40 hover:text-white uppercase tracking-widest text-[10px] font-bold"
              >
                APENAS APROVAR
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    // Reutiliza a lógica existente de handleCreateProject
                    await handleCreateProject();
                    setIsProjectModalOpen(false);
                    // O handleCreateProject já faz o invalidate e navega ou mostra mensagem
                  } catch (err) {
                    toast.error("Erro ao criar projeto");
                  }
                }}
                className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white uppercase tracking-widest text-[10px] font-bold"
              >
                CRIAR PROJETO AGORA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL PARA PRE-VISUALIZACAO DO CONTRATO */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-none">
            <DialogHeader className="p-6 border-b border-white/5 shrink-0">
              <DialogTitle className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B7355]">
                PRÉ-VISUALIZAÇÃO DO CONTRATO
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-12 bg-white text-black">
              <div 
                className="prose prose-sm max-w-none contract-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml || '' }} 
              />
            </div>
            <DialogFooter className="p-4 border-t border-white/5 shrink-0 bg-[#0A0A0A]">
              <Button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="bg-transparent border border-white/10 text-white hover:bg-white/5 rounded-none uppercase text-[10px] tracking-widest px-8"
              >
                FECHAR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ClienteFicha;