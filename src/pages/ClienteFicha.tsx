import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, History, User, Building, LayoutGrid, Clock, Pencil, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ORIGENS = ['Instagram', 'Indicação', 'Site', 'Outro'];

const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', email: '', cpf_cnpj: '', cidade: '', endereco_imovel: '', origem: 'Instagram', observacoes: ''
  });

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*, historico:historico_clientes(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('stage').eq('cliente_id', id).maybeSingle();
      return data;
    }
  });

  const { data: projeto } = useQuery({
    queryKey: ['projeto', id],
    queryFn: async () => {
      const { data } = await supabase.from('projetos').select('status_geral').eq('cliente_id', id).maybeSingle();
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
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('clientes').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente atualizado');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    }
  });

  if (isLoading) return <div className="text-white p-10">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-[#E8E4DF]">
      <Sidebar user="User" />
      <main className="flex-1 ml-[230px] p-10 max-w-5xl space-y-12">
        {/* Topo */}
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold font-['Courier_New'] uppercase text-[#E8E4DF]">{formData.nome}</h1>
            <p className="text-sm text-[#8B7355] font-['Courier_New']">{formData.cidade} • {formData.origem}</p>
            <a href={`https://wa.me/55${formData.whatsapp.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-2 text-xs text-[#8B7355] hover:underline">
              <Phone size={12} /> {formData.whatsapp}
            </a>
          </div>
          <Button onClick={() => setIsEditing(!isEditing)} className="bg-transparent border border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355] hover:text-white rounded-none">
            <Pencil size={16} className="mr-2" /> EDITAR
          </Button>
        </header>

        {/* Dados Pessoais */}
        <section className="bg-[#0A0A0A] p-8 border border-[#3A3A3A]">
          <h2 className="text-[#8B7355] font-['Courier_New'] uppercase tracking-widest mb-6">DADOS PESSOAIS</h2>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries({ 'Nome': 'nome', 'WhatsApp': 'whatsapp', 'E-mail': 'email', 'CPF/CNPJ': 'cpf_cnpj', 'Cidade': 'cidade', 'Endereço': 'endereco_imovel', 'Origem': 'origem' }).map(([label, field]) => (
              <div key={field} className="space-y-1">
                <Label className="text-[10px] text-white/40 uppercase">{label}</Label>
                {isEditing ? (
                  <Input value={formData[field as keyof typeof formData]} onChange={(e) => setFormData({...formData, [field]: e.target.value})} className="bg-[#1A1816] border-[#3A3A3A]" />
                ) : (
                  <p className="text-[#E8E4DF]">{formData[field as keyof typeof formData] || '—'}</p>
                )}
              </div>
            ))}
          </div>
          {isEditing && <Button onClick={() => saveMutation.mutate(formData)} className="mt-6 bg-[#8B7355] text-white rounded-none w-full">SALVAR ALTERAÇÕES</Button>}
        </section>

        {/* Cards Grid */}
        <section className="grid grid-cols-2 gap-4">
          {[ {title: 'PIPELINE', val: lead?.stage || '—', action: 'VER NO PIPELINE', link: '/pipeline'},
             {title: 'PROPOSTA', val: '—', action: 'ABRIR PROPOSTA', link: '/calculadora'},
             {title: 'PROJETO', val: projeto?.status_geral || '—', action: 'VER PROJETO', link: '/projetos'},
             {title: 'FINANCEIRO', val: '—', action: 'VER PARCELAS', link: '/financeiro'}
          ].map((card, i) => (
            <div key={i} className="bg-[#1A1816] border border-[#3A3A3A] p-6 space-y-4">
              <h3 className="text-[#8B7355] font-['Courier_New'] text-xs uppercase">{card.title}</h3>
              <p className="text-[#E8E4DF] text-lg">{card.val}</p>
              <Button onClick={() => navigate(card.link)} className="bg-transparent border border-[#8B7355] text-[#8B7355] w-full text-[10px] uppercase">
                {card.action}
              </Button>
            </div>
          ))}
        </section>

        {/* Anotações */}
        <section className="space-y-2">
            <Label className="text-[#8B7355] font-['Courier_New'] uppercase text-xs">ANOTAÇÕES INTERNAS</Label>
            <textarea 
                value={formData.observacoes} 
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                onBlur={() => saveMutation.mutate(formData)}
                className="w-full h-32 bg-[#1A1816] border border-[#3A3A3A] p-4 text-[#E8E4DF]"
            />
        </section>
      </main>
    </div>
  );
};

export default ClienteFicha;
