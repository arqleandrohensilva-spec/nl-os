
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Upload, 
  MessageSquare,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  item: string;
  categoria: string;
  status: 'PENDENTE' | 'RECEBIDO';
  data_recebimento: string | null;
  observacao: string | null;
  url_arquivo: string | null;
}

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  cliente_id?: string;
}

const CATEGORIAS = [
  "DOCUMENTAÇÃO DO IMÓVEL",
  "DOCUMENTAÇÃO TÉCNICA",
  "PROJETOS COMPLEMENTARES",
  "DADOS DO CLIENTE"
];

const DEFAULT_ITEMS = [
  { item: "Matrícula do imóvel", categoria: "DOCUMENTAÇÃO DO IMÓVEL" },
  { item: "Escritura ou contrato de compra e venda", categoria: "DOCUMENTAÇÃO DO IMÓVEL" },
  { item: "IPTU (último exercício)", categoria: "DOCUMENTAÇÃO DO IMÓVEL" },
  { item: "Documentação de aprovações anteriores (se existirem)", categoria: "DOCUMENTAÇÃO DO IMÓVEL" },
  
  { item: "Levantamento topográfico do lote", categoria: "DOCUMENTAÇÃO TÉCNICA" },
  { item: "Sondagem do solo", categoria: "DOCUMENTAÇÃO TÉCNICA" },
  { item: "Plantas existentes (se reforma)", categoria: "DOCUMENTAÇÃO TÉCNICA" },
  { item: "Legislação do condomínio (se aplicável)", categoria: "DOCUMENTAÇÃO TÉCNICA" },
  
  { item: "ART/RRT de projetos complementares", categoria: "PROJETOS COMPLEMENTARES" },
  { item: "Projeto estrutural existente (se reforma)", categoria: "PROJETOS COMPLEMENTARES" },
  
  { item: "CPF / CNPJ", categoria: "DADOS DO CLIENTE" },
  { item: "Comprovante de endereço", categoria: "DADOS DO CLIENTE" },
  { item: "RG ou CNH", categoria: "DADOS DO CLIENTE" }
];

const DocumentosChecklist = ({ projeto }: { projeto: Projeto }) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [savingObs, setSavingObs] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [leadPhone, setLeadPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklist();
    if (projeto.cliente_id) {
      fetchLeadPhone();
    }
  }, [projeto.id, projeto.cliente_id]);

  const fetchLeadPhone = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('whats')
        .eq('id', projeto.cliente_id)
        .single();
      
      if (data) setLeadPhone(data.whats);
    } catch (error) {
      console.error('Error fetching phone:', error);
    }
  };

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from('documentos_checklist')
        .select('*')
        .eq('projeto_id', projeto.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize with default items
        const newItems = DEFAULT_ITEMS.map(i => ({
          projeto_id: projeto.id,
          ...i,
          status: 'PENDENTE'
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('documentos_checklist')
          .insert(newItems)
          .select();

        if (insertError) throw insertError;
        setItems((insertedData as ChecklistItem[]) || []);
      } else {
        setItems(data as ChecklistItem[]);
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
      toast.error('Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: ChecklistItem) => {
    try {
      const newStatus = item.status === 'PENDENTE' ? 'RECEBIDO' : 'PENDENTE';
      const now = newStatus === 'RECEBIDO' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('documentos_checklist')
        .update({ 
          status: newStatus, 
          data_recebimento: now 
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: newStatus as any, data_recebimento: now } : i
      ));

      if (newStatus === 'RECEBIDO') {
        toast.success(`Item "${item.item}" marcado como recebido`);
        checkAllCompleted();
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleUpdateObservacao = async (itemId: string, observacao: string) => {
    try {
      setSavingObs(itemId);
      const { error } = await supabase
        .from('documentos_checklist')
        .update({ observacao })
        .eq('id', itemId);

      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, observacao } : i
      ));
    } catch (error) {
      toast.error('Erro ao salvar observação');
    } finally {
      setSavingObs(null);
    }
  };

  const handleFileUpload = async (itemId: string, itemNome: string, file: File) => {
    try {
      setUploadingItem(itemId);
      
      const folderPath = `/NL Arquitetos/07 - Projetos NL OS/${projeto.nome_cliente}/00 - Documentos do Cliente`;
      const fileName = `${itemNome.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.${file.name.split('.').pop()}`;
      const fullPath = `${folderPath}/${fileName}`;

      // Create folder if not exists via dropbox-proxy
      await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'create_folder', folder: folderPath }
      });

      const arrayBuffer = await file.arrayBuffer();
      const dropboxArg = JSON.stringify({
        path: fullPath,
        mode: 'overwrite',
        autorename: false,
        mute: false,
        strict_conflict: false
      });

      const { data, error: uploadError } = await supabase.functions.invoke('dropbox-proxy', {
        body: arrayBuffer,
        headers: {
          'x-action': 'upload',
          'dropbox-api-arg': dropboxArg,
          'content-type': 'application/octet-stream'
        }
      });

      if (uploadError) throw uploadError;

      // Update Supabase
      const { error: dbError } = await supabase
        .from('documentos_checklist')
        .update({ 
          url_arquivo: fullPath,
          status: 'RECEBIDO',
          data_recebimento: new Date().toISOString()
        })
        .eq('id', itemId);

      if (dbError) throw dbError;

      setItems(prev => prev.map(i => 
        i.id === itemId ? { 
          ...i, 
          url_arquivo: fullPath, 
          status: 'RECEBIDO', 
          data_recebimento: new Date().toISOString() 
        } : i
      ));

      toast.success('Arquivo enviado com sucesso!');
      checkAllCompleted();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload para o Dropbox');
    } finally {
      setUploadingItem(null);
    }
  };

  const handleWhatsAppReminder = () => {
    const pendentes = items.filter(i => i.status === 'PENDENTE').map(i => i.item);
    if (pendentes.length === 0) {
      toast.success("Toda a documentação já foi recebida!");
      return;
    }

    const saudacao = "Olá " + projeto.nome_cliente.split(' ')[0] + ", aqui é da NL Arquitetos.";
    const introducao = "Para darmos continuidade ao seu projeto " + projeto.nome + ", precisamos dos seguintes documentos pendentes:";
    const lista = pendentes.map(item => "• " + item).join("\n");
    const fechamento = "\n\nVocê pode enviar por aqui ou fazer o upload diretamente no nosso portal. Obrigado!";
    
    const message = `${saudacao}\n\n${introducao}\n${lista}${fechamento}`;
    const encodedMessage = encodeURIComponent(message);
    
    // Clean phone number: remove anything that is not a digit
    const cleanPhone = leadPhone ? leadPhone.replace(/\D/g, '') : '';
    const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const checkAllCompleted = () => {

  useEffect(() => {
    if (items.length > 0) {
      const allReceived = items.every(i => i.status === 'RECEBIDO');
      
      if (allReceived && !isFirstLoad) {
        toast.info(`Documentação do projeto ${projeto.nome} está completa. Pronto para iniciar.`, {
          duration: 5000,
          icon: <CheckCircle2 className="text-green-500" />
        });
      }
      
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    }
  }, [items]);

  const total = items.length;
  const recebidos = items.filter(i => i.status === 'RECEBIDO').length;
  const porcentagem = total > 0 ? (recebidos / total) * 100 : 0;
  const isCompleto = recebidos === total && total > 0;

  if (loading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-bronze" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Resumo Card */}
      <div className="bg-[#2A2825] border border-white/5 p-6 rounded-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Status da Documentação</h4>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{recebidos} de {total}</span>
              <span className="text-white/20">|</span>
              <Badge className={cn(
                "rounded-none text-[9px] uppercase tracking-widest",
                isCompleto ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-bronze/10 text-bronze border-bronze/20"
              )}>
                {isCompleto ? "COMPLETO" : "INCOMPLETO"}
              </Badge>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40 mb-2">
              <span>Progresso</span>
              <span>{Math.round(porcentagem)}%</span>
            </div>
            <Progress value={porcentagem} className="h-1 bg-white/5" indicatorClassName="bg-bronze" />
          </div>
          <div className="flex shrink-0">
            <Button 
              onClick={handleWhatsAppReminder}
              disabled={recebidos === total}
              variant="outline"
              className="bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366] hover:text-white transition-all text-[10px] uppercase tracking-widest h-10 px-6 rounded-none font-bold"
            >
              <MessageSquare size={14} className="mr-2" />
              Cobrar Pendências
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[#242220] border border-white/10 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
          <FileText className="text-bronze" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">DOCUMENTOS NECESSÁRIOS — {projeto.nome}</h2>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {CATEGORIAS.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="text-[11px] font-bold text-bronze tracking-[0.3em] uppercase border-l-2 border-bronze pl-3 py-1 bg-white/[0.02]">
                {cat}
              </h3>
              
              <div className="grid grid-cols-1 gap-1">
                {items.filter(i => i.categoria === cat).map(item => (
                  <div key={item.id} className="group bg-black/10 border border-white/5 p-4 transition-all hover:bg-black/20 hover:border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <button 
                          onClick={() => handleToggleStatus(item)}
                          className={cn(
                            "mt-0.5 transition-colors",
                            item.status === 'RECEBIDO' ? "text-green-500" : "text-white/20 hover:text-white/40"
                          )}
                        >
                          {item.status === 'RECEBIDO' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={cn(
                              "text-[11px] font-medium transition-colors",
                              item.status === 'RECEBIDO' ? "text-white/90" : "text-white/50"
                            )}>
                              {item.item}
                            </span>
                            <Badge className={cn(
                              "text-[8px] uppercase tracking-widest px-1.5 py-0 rounded-none",
                              item.status === 'RECEBIDO' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}>
                              {item.status}
                            </Badge>
                          </div>
                          
                          {item.data_recebimento && (
                            <p className="text-[9px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock size={10} /> Recebido em {format(new Date(item.data_recebimento), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}

                          <div className="mt-3 relative">
                            <Textarea 
                              placeholder="Observação (ex: Aguardando cartório)"
                              defaultValue={item.observacao || ''}
                              onBlur={(e) => handleUpdateObservacao(item.id, e.target.value)}
                              className="bg-black/40 border-white/5 rounded-none text-[10px] min-h-[40px] focus:ring-bronze/30 transition-all focus:border-white/20"
                            />
                            {savingObs === item.id && (
                              <div className="absolute right-2 bottom-2">
                                <Loader2 size={10} className="animate-spin text-bronze" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:self-start">
                        {item.url_arquivo ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 text-[9px] uppercase tracking-widest text-bronze hover:text-white hover:bg-bronze transition-all"
                            onClick={() => window.open(`https://www.dropbox.com/home${item.url_arquivo}`, '_blank')}
                          >
                            <FileText size={12} className="mr-2" /> VER ARQUIVO
                          </Button>
                        ) : (
                          <div className="relative">
                            <input 
                              type="file" 
                              id={`upload-${item.id}`} 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(item.id, item.item, file);
                              }}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={uploadingItem === item.id}
                              onClick={() => document.getElementById(`upload-${item.id}`)?.click()}
                              className="bg-transparent border-white/10 text-white/60 hover:text-white hover:border-bronze hover:bg-bronze h-8 text-[9px] uppercase tracking-widest rounded-none transition-all"
                            >
                              {uploadingItem === item.id ? (
                                <Loader2 size={12} className="animate-spin mr-2" />
                              ) : (
                                <Upload size={12} className="mr-2" />
                              )}
                              UPLOAD
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentosChecklist;
