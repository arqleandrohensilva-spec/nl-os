import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, History, User, Building, LayoutGrid, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  'Novo Lead',
  'Reunião Agendada',
  'Briefing Preenchido',
  'Proposta Enviada',
  'Negociação',
  'Fechado'
];

const ORIGENS = ['Instagram', 'Indicação', 'Site', 'Outro'];
const TIPOS_PROJETO = ['ARQ+INT', 'Interiores', 'Comercial'];

const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cpf_cnpj: '',
    cidade: '',
    endereco_imovel: '',
    origem: 'Instagram',
    status_comercial: 'Novo Lead',
    tipo_projeto: 'ARQ+INT',
    area_m2: '',
    observacoes: ''
  });

  const { data: cliente, isLoading: isClienteLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*, historico:historico_clientes(*)')
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
      if (isNew) return [];
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
        status_comercial: cliente.status_comercial || 'Novo Lead',
        tipo_projeto: cliente.tipo_projeto || 'ARQ+INT',
        area_m2: cliente.area_m2?.toString() || '',
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        area_m2: data.area_m2 ? parseFloat(data.area_m2) : null
      };

      let result;
      if (isNew) {
        result = await supabase.from('clientes').insert(payload).select().single();
      } else {
        result = await supabase.from('clientes').update(payload).eq('id', id).select().single();
      }

      if (result.error) throw result.error;

      // Sincronizar com Pipeline (Leads)
      const clienteSalvo = result.data;
      
      // Verificar se já existe lead vinculado
      const { data: leadExistente } = await supabase
        .from('leads')
        .select('id')
        .eq('cliente_id', clienteSalvo.id)
        .single();

      if (leadExistente) {
        // Atualiza lead existente
        await supabase.from('leads').update({
          nome: clienteSalvo.nome,
          whats: clienteSalvo.whatsapp,
          cidade: clienteSalvo.cidade,
          tipo: clienteSalvo.tipo_projeto,
          area: clienteSalvo.area_m2,
          stage: clienteSalvo.status_comercial,
          updated_at: new Date().toISOString()
        }).eq('id', leadExistente.id);
      } else {
        // Cria novo lead se não for 'Fechado' ou 'Perdido' (embora o trigger no DB possa lidar com isso, fazemos aqui por segurança)
        await supabase.from('leads').insert({
          cliente_id: clienteSalvo.id,
          nome: clienteSalvo.nome,
          whats: clienteSalvo.whatsapp,
          cidade: clienteSalvo.cidade,
          tipo: clienteSalvo.tipo_projeto,
          area: clienteSalvo.area_m2,
          stage: clienteSalvo.status_comercial,
          origem: clienteSalvo.origem,
          temp: 'Morno'
        });
      }

      return clienteSalvo;
    },
    onSuccess: (data) => {
      toast.success(isNew ? 'Cliente criado com sucesso' : 'Cliente atualizado');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      queryClient.invalidateQueries({ queryKey: ['historico_cliente', id] });
      if (isNew) navigate(`/clientes/${data.id}`);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao salvar cliente');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isNew && isClienteLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A] text-[#E8E4DF]">
        <Sidebar user="User" />
        <main className="flex-1 ml-[230px] flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-[#E8E4DF]">
      <Sidebar user="User" />
      
      <main className="flex-1 ml-[230px] p-10 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/clientes')}
            className="p-2 hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-['Courier_New'] font-bold text-[#8B7355] uppercase tracking-tighter">
              {isNew ? 'NOVO CLIENTE' : `FICHA: ${formData.nome}`}
            </h1>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-['Courier_New']">Módulo CRM · Ecossistema NL OS</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* BLOCO 1: DADOS PESSOAIS */}
          <section className="bg-[#1A1816] p-8 border border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <User size={16} className="text-[#8B7355]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white font-['Courier_New']">DADOS PESSOAIS</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Nome Completo</Label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">WhatsApp</Label>
                <Input 
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">E-mail</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">CPF ou CNPJ</Label>
                <Input 
                  value={formData.cpf_cnpj}
                  onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Cidade</Label>
                <Input 
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Origem</Label>
                <Select value={formData.origem} onValueChange={(v) => handleInputChange('origem', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1816] border-white/10 text-white font-['Courier_New']">
                    {ORIGENS.map(o => <SelectItem key={o} value={o}>{o.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Endereço do Imóvel</Label>
                <Input 
                  value={formData.endereco_imovel}
                  onChange={(e) => handleInputChange('endereco_imovel', e.target.value)}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                />
              </div>
            </div>
          </section>

          {/* BLOCO 2: STATUS COMERCIAL */}
          <section className="bg-[#1A1816] p-8 border border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Building size={16} className="text-[#8B7355]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white font-['Courier_New']">STATUS COMERCIAL</h2>
            </div>
            
            <div className="space-y-2 max-w-md">
              <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Estágio Atual</Label>
              <Select value={formData.status_comercial} onValueChange={(v) => handleInputChange('status_comercial', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1816] border-white/10 text-white font-['Courier_New']">
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-white/20 mt-2 italic font-['Courier_New']">
                * Ao salvar, o card no Pipeline será criado ou movido automaticamente.
              </p>
            </div>
          </section>

          {/* BLOCO 3: PROJETO VINCULADO */}
          {formData.status_comercial === 'Fechado' && (
            <section className="bg-[#1A1816] p-8 border border-white/5 space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                <LayoutGrid size={16} className="text-[#8B7355]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white font-['Courier_New']">PROJETO VINCULADO</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Tipo de Projeto</Label>
                  <Select value={formData.tipo_projeto} onValueChange={(v) => handleInputChange('tipo_projeto', v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1816] border-white/10 text-white font-['Courier_New']">
                      {TIPOS_PROJETO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Área (m²)</Label>
                  <Input 
                    type="number"
                    value={formData.area_m2}
                    onChange={(e) => handleInputChange('area_m2', e.target.value)}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-white font-['Courier_New'] text-xs tracking-widest"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40 font-['Courier_New']">Observações</Label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-white font-['Courier_New'] text-xs tracking-widest min-h-[100px] outline-none focus:border-[#8B7355] transition-colors"
                  />
                </div>
              </div>
            </section>
          )}

          {/* BLOCO 4: HISTÓRICO */}
          {!isNew && (
            <section className="bg-[#1A1816] p-8 border border-white/5 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                <History size={16} className="text-[#8B7355]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white font-['Courier_New']">HISTÓRICO</h2>
              </div>
              
              <div className="space-y-4">
                {historico?.length === 0 && (
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-['Courier_New']">Nenhuma alteração registrada</p>
                )}
                {historico?.map((h) => (
                  <div key={h.id} className="flex gap-4 items-start relative pb-4 last:pb-0">
                    <div className="mt-1 w-2 h-2 rounded-full bg-[#8B7355] shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/60 font-['Courier_New'] uppercase tracking-widest">
                        Status alterado de <span className="text-white/40">{h.status_anterior || 'INICIAL'}</span> para <span className="text-white font-bold">{h.status_novo}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-bold">
                        <Clock size={10} />
                        {format(new Date(h.data_hora), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-end gap-4 pt-6">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate('/clientes')}
              className="border-white/10 hover:bg-white/5 text-white/40 rounded-none px-10 font-['Courier_New'] text-xs font-bold uppercase tracking-widest h-14"
            >
              CANCELAR
            </Button>
            <Button 
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-12 font-['Courier_New'] text-xs font-bold uppercase tracking-widest h-14"
            >
              {saveMutation.isPending ? 'SALVANDO...' : (
                <div className="flex items-center gap-2">
                  <Save size={16} />
                  SALVAR FICHA
                </div>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ClienteFicha;
