import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, History, User, Phone, Pencil, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const ORIGENS = ['Instagram', 'Indicação', 'Site', 'Outro'];

const ShortcutCard = ({ label, value, actionLabel, onClick }: { label: string, value: string, actionLabel: string, onClick: () => void }) => (
  <div className="bg-[#1A1A1A] border border-white/10 border border-[#3A3A3A] p-6 flex flex-col justify-between h-40">
    <div className="space-y-1">
      <span className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-widest">{label}</span>
      <p className="text-[#E8E4DF] text-lg font-medium">{value}</p>
    </div>
    <Button 
      variant="outline" 
      onClick={onClick}
      className="bg-transparent border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-[#1A1816] rounded-none text-[10px] uppercase tracking-widest h-8 font-['Courier_New'] transition-colors"
    >
      {value === '—' ? 'CRIAR' : actionLabel}
    </Button>
  </div>
);

const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
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
    quem_decide: ''
  });

  const { data: cliente, isLoading: isClienteLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
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
    }
  });

  const { data: lead } = useQuery({
    queryKey: ['lead_status', id],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('stage').eq('cliente_id', id).maybeSingle();
      return data;
    }
  });

  const { data: projeto } = useQuery({
    queryKey: ['projeto_status', id],
    queryFn: async () => {
      const { data } = await supabase.from('projetos').select('status_geral, id').eq('cliente_id', id).maybeSingle();
      return data;
    }
  });

  const { data: financeiro } = useQuery({
    queryKey: ['financeiro_resumo', projeto?.id],
    enabled: !!projeto?.id,
    queryFn: async () => {
      const { data } = await supabase.from('financeiro_parcelas').select('valor_recebido').eq('projeto_id', projeto?.id);
      const total = data?.reduce((acc, curr) => acc + (Number(curr.valor_recebido) || 0), 0) || 0;
      return total;
    }
  });

  const { data: proposta } = useQuery({
    queryKey: ['proposta_ultima', cliente?.nome],
    enabled: !!cliente?.nome,
    queryFn: async () => {
      const { data } = await supabase
        .from('proposals')
        .select('id, valor_completo')
        .eq('cliente', cliente.nome)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    }
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
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
        quem_decide: cliente.quem_decide || ''
      });
    }
  }, [cliente]);

  const { data: briefing } = useQuery({
    queryKey: ['briefing_cliente', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('briefings')
        .select('*')
        .eq('cliente_id', id)
        .maybeSingle();
      return data;
    }
  });

  useEffect(() => {
    if (briefing && briefing.respostas && !formData.imovel_definido && !formData.orcamento) {
      const resp = briefing.respostas as any;
      const mapping = {
        'Sim, já tenho': 'Sim, definido',
        'Estou buscando': 'Em busca',
        'Ainda não': 'Não',
        'arq': 'ARQ+INT',
        'int': 'Interiores',
        'com': 'Comercial',
        'Ate 500k': 'Abaixo',
        '500k - 1M': 'R$300-700k',
        'Acima 1M': 'Acima R$700k',
        'Imediato': 'Imediato',
        'Próximos 6 meses': '6 meses'
      };

      setFormData(prev => ({
        ...prev,
        imovel_definido: mapping[resp.imovel_definido as keyof typeof mapping] || '',
        tipo_projeto: mapping[briefing.tipo_projeto as keyof typeof mapping] || '',
        area_m2: resp.area_estimada || resp.area_terreno || '',
        orcamento: mapping[resp.orcamento as keyof typeof mapping] || '',
        prazo: mapping[resp.prazo as keyof typeof mapping] || '',
        origem: resp.origem || prev.origem
      }));
    }
  }, [briefing, formData.imovel_definido, formData.orcamento]);

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
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    
    const newScore = calcularScore(newFormData);
    const newTemp = newScore >= 9 ? 'Quente' : newScore >= 5 ? 'Morno' : 'Frio';

    // Atualiza cliente
    const updateValue = key === 'area_m2' ? Number(value) : value;
    await supabase.from('clientes').update({ [key]: updateValue } as any).eq('id', id);
    
    // Sincroniza com o Lead
    await supabase.from('leads').update({
      score: newScore,
      temp: newTemp
    }).eq('cliente_id', id);
    
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    queryClient.invalidateQueries({ queryKey: ['lead_status', id] });
  }, [formData, id, queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Garantir que area_m2 seja número se presente
      const cleanData: any = { ...data };
      if (cleanData.area_m2) cleanData.area_m2 = Number(cleanData.area_m2);
      
      const { error } = await supabase.from('clientes').update(cleanData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      setIsEditing(false);
    }
  });

  const handleBlurSave = () => {
    saveMutation.mutate({ observacoes: formData.observacoes });
  };

  if (isClienteLoading) return <div className="min-h-screen bg-[#1A1A1A] border border-white/10 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div></div>;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex min-h-screen bg-[#1A1A1A] border border-white/10 text-[#E8E4DF]">
      <Sidebar user="User" />
      
      <main className="flex-1 ml-[230px] p-12 max-w-6xl mx-auto space-y-12">
        {/* TOPO */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-[#E8E4DF] font-['Courier_New'] uppercase tracking-tight">{cliente?.nome}</h1>
            <div className="flex items-center gap-4 text-white/50 text-sm">
              <span>{cliente?.cidade}</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>{cliente?.origem}</span>
            </div>
            <a 
              href={`https://wa.me/55${cliente?.whatsapp?.replace(/\D/g, '')}`} 
              target="_blank" 
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#8B7355]/10 text-[#8B7355] hover:bg-[#8B7355]/20 transition-colors text-xs font-medium"
            >
              <Phone size={14} /> {cliente?.whatsapp}
            </a>
          </div>
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-white rounded-none font-['Courier_New'] font-bold uppercase"
          >
            {isEditing ? <><Save size={16} className="mr-2" /> SALVAR</> : <><Pencil size={16} className="mr-2" /> EDITAR</>}
          </Button>
        </div>

        {/* DADOS PESSOAIS */}
        <section className="space-y-6">
          <h2 className="text-[#8B7355] font-['Courier_New'] text-xs uppercase tracking-[0.3em] font-bold">DADOS PESSOAIS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 border border-[#3A3A3A] bg-[#0A0A0A]">
            {[
              { label: 'Nome', key: 'nome' },
              { label: 'WhatsApp', key: 'whatsapp' },
              { label: 'E-mail', key: 'email' },
              { label: 'CPF/CNPJ', key: 'cpf_cnpj' },
              { label: 'Cidade', key: 'cidade' },
              { label: 'Origem', key: 'origem', isSelect: true, options: ORIGENS },
              { label: 'Endereço do imóvel', key: 'endereco_imovel', fullWidth: true },
            ].map((field) => (
              <div key={field.key} className={cn("space-y-2", field.fullWidth && "md:col-span-2 lg:col-span-3")}>
                <Label className="text-[10px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                {isEditing ? (
                  field.isSelect ? (
                    <Select value={formData[field.key as keyof typeof formData]} onValueChange={(v) => setFormData({...formData, [field.key]: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-none h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border border-white/10 border-white/10">
                        {field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={formData[field.key as keyof typeof formData]} 
                      onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                    />
                  )
                ) : (
                  <p className="text-[#E8E4DF] text-sm">{formData[field.key as keyof typeof formData] || '—'}</p>
                )}
              </div>
            ))}
          </div>
          {isEditing && (
            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#8B7355] text-white rounded-none px-8">SALVAR DADOS</Button>
            </div>
          )}
        </section>

        {/* QUALIFICAÇÃO */}
        <section className="space-y-6">
          <h2 className="text-[#8B7355] font-['Courier_New'] text-xs uppercase tracking-[0.3em] font-bold">QUALIFICAÇÃO</h2>
          <div className="bg-[#0A0A0A] border border-[#3A3A3A] p-8 space-y-8">
            {/* SCORE CARD */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-[#8B7355] font-bold tracking-widest uppercase">Score de Qualificação</span>
                <span className="text-xl font-medium">{score}/15 - {temp}</span>
              </div>
              <Progress value={(score / 15) * 100} indicatorClassName={cn(
                "transition-all duration-500",
                temp === 'Frio' ? 'bg-[#555555]' : temp === 'Morno' ? 'bg-[#8B7355]' : 'bg-[#C8A96E]'
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Tem imóvel/lote definido?', key: 'imovel_definido', options: ['Sim, definido', 'Em busca', 'Não'] },
                { label: 'Tipo de projeto', key: 'tipo_projeto', options: ['ARQ+INT', 'Interiores', 'Comercial'] },
                { label: 'Área estimada (m²)', key: 'area_m2', isNumeric: true },
                { label: 'Orçamento estimado', key: 'orcamento', options: ['Acima R$700k', 'R$300-700k', 'Abaixo', 'Não sei'] },
                { label: 'Quando quer começar', key: 'prazo', options: ['Imediato', '6 meses', 'Sem prazo'] },
                { label: 'Quem decide', key: 'quem_decide', options: ['Sozinho', 'Com cônjuge', 'Com sócios'] },
                { label: 'Origem', key: 'origem', options: ['Indicação', 'Google', 'Instagram', 'Outro'] },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                  {field.isNumeric ? (
                    <Input 
                      type="number"
                      value={formData[field.key as keyof typeof formData]} 
                      onChange={(e) => updateQualificacao(field.key, e.target.value)}
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {field.options?.map(opt => (
                        <button
                          key={opt}
                          onClick={() => updateQualificacao(field.key, opt)}
                          className={cn(
                            "px-3 py-2 text-[10px] uppercase border transition-colors",
                            formData[field.key as keyof typeof formData] === opt
                              ? "bg-[#8B7355] border-[#8B7355] text-white"
                              : "bg-transparent border-[#3A3A3A] text-white/50 hover:border-[#8B7355]"
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
        </section>

        {/* ATALHOS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ShortcutCard 
            label="PIPELINE" 
            value={lead?.stage || '—'} 
            actionLabel="VER NO PIPELINE" 
            onClick={() => navigate('/pipeline')} 
          />
          <ShortcutCard 
            label="PROPOSTA" 
            value={proposta?.valor_completo ? formatCurrency(Number(proposta.valor_completo)) : '—'} 
            actionLabel="ABRIR PROPOSTA" 
            onClick={() => proposta?.id ? navigate(`/calculadora/${proposta.id}`) : navigate('/calculadora')} 
          />
          <ShortcutCard 
            label="PROJETO" 
            value={projeto?.status_geral ? `${projeto.status_geral} · VER PROJETO` : '—'} 
            actionLabel="VER PROJETO" 
            onClick={() => projeto?.id ? navigate(`/projetos/detalhe/${projeto.id}`) : navigate('/projetos/gestao')} 
          />
          <ShortcutCard 
            label="FINANCEIRO" 
            value={financeiro ? `${formatCurrency(financeiro)} recebido` : '—'} 
            actionLabel="VER PARCELAS" 
            onClick={() => navigate('/financeiro/projetos')} 
          />
        </section>

        {/* ANOTAÇÕES */}
        <section className="space-y-4">
          <Label className="text-[#8B7355] font-['Courier_New'] text-xs uppercase tracking-[0.3em] font-bold">ANOTAÇÕES INTERNAS</Label>
          <textarea 
            value={formData.observacoes} 
            onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
            onBlur={handleBlurSave}
            placeholder="Digite aqui anotações sobre este cliente..."
            className="w-full h-40 bg-[#0A0A0A] border border-[#3A3A3A] p-6 text-[#E8E4DF] text-sm outline-none focus:border-[#8B7355] transition-colors resize-none"
          />
        </section>

        {/* HISTÓRICO */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <History size={16} className="text-[#8B7355]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#8B7355] font-['Courier_New']">HISTÓRICO</h2>
          </div>
          <div className="space-y-6 pl-2">
            {!historico || historico.length === 0 ? (
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-['Courier_New']">Nenhuma alteração registrada</p>
            ) : (
              historico.map((h) => (
                <div key={h.id} className="flex gap-4 items-start relative">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-[#8B7355] shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/60 font-['Courier_New'] uppercase tracking-widest leading-relaxed">
                      Status alterado de <span className="text-white/40">{h.status_anterior || 'INICIAL'}</span> para <span className="text-white font-bold">{h.status_novo}</span>
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
      </main>
    </div>
  );
};

export default ClienteFicha;
