import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { excluirClienteCompleto } from '@/lib/excluir-cliente';

const ExclusaoClientes = () => {
  const queryClient = useQueryClient();
  const [clienteId, setClienteId] = useState<string>('');
  const [excluirDropbox, setExcluirDropbox] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const { data: clientes } = useQuery({
    queryKey: ['clientes-exclusao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cidade')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const clienteSelecionado = clientes?.find((c) => c.id === clienteId);

  const handleExcluir = async () => {
    if (!clienteId) return;
    setExcluindo(true);
    try {
      const resultado = await excluirClienteCompleto(clienteId, { excluirDropbox });
      toast.success(
        excluirDropbox
          ? `Cliente excluído. Pastas removidas no Dropbox: ${resultado.pastasExcluidas.length}${
              resultado.pastasComFalha.length ? ` · falhas: ${resultado.pastasComFalha.length}` : ''
            }`
          : 'Cliente excluído do NL OS.'
      );
      setClienteId('');
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clientes-exclusao'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente: ' + (error?.message || 'tente novamente'));
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-rose-500/20 p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Trash2 size={80} className="text-rose-500" />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500/10 flex items-center justify-center rounded-[1px]">
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Exclusão de Clientes</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Remove a ficha, projetos e a pasta no Dropbox</p>
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed">
          A exclusão apaga o cliente e todos os registros ligados a ele (projetos, etapas, documentos,
          contratos, propostas e parcelas). Esta ação não pode ser desfeita.
        </p>

        <div className="space-y-2">
          <Label className="text-[9px] uppercase tracking-widest text-white/40">Cliente</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="bg-black/40 border-white/10 rounded-[1px] text-[11px] text-white h-11">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1816] border-white/10">
              {clientes?.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-[11px] text-white">
                  {c.nome}{c.cidade ? ` · ${c.cidade}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="excluir-dropbox"
            checked={excluirDropbox}
            onCheckedChange={(v) => setExcluirDropbox(v === true)}
            className="border-white/20 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
          />
          <Label htmlFor="excluir-dropbox" className="text-[10px] uppercase tracking-widest text-white/60 cursor-pointer">
            Excluir também a pasta do projeto no Dropbox
          </Label>
        </div>

        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!clienteId || excluindo}
          className="w-full h-11 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white text-[10px] uppercase tracking-[0.2em] font-bold"
        >
          {excluindo ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Trash2 size={14} className="mr-2" />}
          Excluir Cliente
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#1A1816] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white uppercase tracking-widest text-sm">
              Excluir {clienteSelecionado?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-xs">
              Serão apagados a ficha do cliente, os projetos e todos os registros vinculados
              {excluirDropbox ? ', além da pasta do projeto no Dropbox' : ''}. Esta ação é definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white text-[10px] uppercase tracking-widest">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleExcluir(); }}
              disabled={excluindo}
              className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] uppercase tracking-widest"
            >
              {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExclusaoClientes;
