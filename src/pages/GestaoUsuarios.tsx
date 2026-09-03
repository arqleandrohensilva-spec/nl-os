import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Users, ShieldCheck, KeyRound, Plus, Trash2, Pencil, Loader2, LayoutDashboard, UserCheck, UserX, Search, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MODULOS } from '@/hooks/use-permissoes';
import { useUserRole } from '@/hooks/use-user-role';

type Perfil = { id: string; nome: string; descricao: string | null; sistema: boolean };
type Permissao = { perfil_id: string; modulo: string; permitido: boolean };
type Usuario = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  profile: { nome: string; telefone: string | null; data_nascimento: string | null; ativo: boolean } | null;
  roles: string[];
  perfis: string[];
};

const senhaValida = (s: string) => s.length >= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s);

const inputCls = 'rounded-none bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-bronze';
const cardCls = 'bg-[#1A1816] border border-white/5 p-8';

const GestaoUsuarios = () => {
  const { isAdmin } = useUserRole();
  const [tab, setTab] = useState('visao');
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos');
  const [detalhe, setDetalhe] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- carregamento ----------
  const carregarPerfis = async () => {
    const [{ data: p }, { data: perms }] = await Promise.all([
      supabase.from('perfis').select('*').order('nome'),
      supabase.from('perfil_permissoes').select('perfil_id, modulo, permitido'),
    ]);
    setPerfis((p || []) as Perfil[]);
    setPermissoes((perms || []) as Permissao[]);
  };

  const carregarUsuarios = async () => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
    if (error || data?.error) {
      toast.error(data?.error || 'Não foi possível carregar os usuários.');
      return;
    }
    setUsuarios(data.users as Usuario[]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([carregarPerfis(), carregarUsuarios()]);
      setLoading(false);
    })();
  }, []);

  // ---------- usuários ----------
  const [userDialog, setUserDialog] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmar: '', telefone: '', nascimento: '',
    perfis: [] as string[], admin: false, ativo: true,
  });
  const [excluir, setExcluir] = useState<Usuario | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: '', email: '', senha: '', confirmar: '', telefone: '', nascimento: '', perfis: [], admin: false, ativo: true });
    setUserDialog(true);
  };

  const abrirEdicao = (u: Usuario) => {
    setEditando(u);
    setForm({
      nome: u.profile?.nome || '', email: u.email || '', senha: '', confirmar: '',
      telefone: u.profile?.telefone || '', nascimento: u.profile?.data_nascimento || '',
      perfis: u.perfis, admin: u.roles.includes('admin'), ativo: u.profile?.ativo ?? true,
    });
    setUserDialog(true);
  };

  const salvarUsuario = async () => {
    if (!form.nome.trim()) return toast.error('Informe o nome completo.');
    if (!editando && !form.email.trim()) return toast.error('Informe o e-mail.');
    if ((!editando || form.senha) && !senhaValida(form.senha)) {
      return toast.error('A senha deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula e um número.');
    }
    if ((!editando || form.senha) && form.senha !== form.confirmar) {
      return toast.error('A confirmação de senha não confere.');
    }

    setSalvando(true);
    const payload = editando
      ? {
          action: 'update', id: editando.id, nome: form.nome, telefone: form.telefone,
          data_nascimento: form.nascimento || null, ativo: form.ativo,
          password: form.senha || undefined, perfis: form.perfis, role: form.admin ? 'admin' : '',
        }
      : {
          action: 'create', email: form.email, password: form.senha, nome: form.nome,
          telefone: form.telefone, data_nascimento: form.nascimento || null,
          perfis: form.perfis, role: form.admin ? 'admin' : null,
        };

    const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
    setSalvando(false);

    if (error || data?.error) {
      toast.error(data?.error || 'Ocorreu um erro ao salvar o usuário. Por favor, tente novamente.');
      return;
    }
    toast.success(editando ? `Usuário ${form.nome} atualizado com sucesso!` : `Usuário ${form.nome} cadastrado com sucesso!`);
    setUserDialog(false);
    carregarUsuarios();
  };

  const confirmarExclusaoUsuario = async () => {
    if (!excluir) return;
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', id: excluir.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Não foi possível excluir o usuário.');
    } else {
      toast.success('Usuário excluído.');
      carregarUsuarios();
    }
    setExcluir(null);
  };

  // ---------- perfis ----------
  const [perfilDialog, setPerfilDialog] = useState(false);
  const [perfilEdit, setPerfilEdit] = useState<Perfil | null>(null);
  const [perfilForm, setPerfilForm] = useState({ nome: '', descricao: '' });
  const [perfilExcluir, setPerfilExcluir] = useState<Perfil | null>(null);

  const salvarPerfil = async () => {
    if (!perfilForm.nome.trim()) return toast.error('Informe o nome do perfil.');
    if (perfilEdit) {
      const { error } = await supabase.from('perfis')
        .update({ nome: perfilForm.nome, descricao: perfilForm.descricao })
        .eq('id', perfilEdit.id);
      if (error) return toast.error(error.message);
      toast.success('Perfil atualizado com sucesso!');
    } else {
      const { data, error } = await supabase.from('perfis')
        .insert({ nome: perfilForm.nome, descricao: perfilForm.descricao })
        .select('id').maybeSingle();
      if (error) return toast.error(error.message);
      if (data) {
        await supabase.from('perfil_permissoes').insert(
          MODULOS.map((m) => ({ perfil_id: data.id, modulo: m.key, permitido: false })),
        );
      }
      toast.success(`Perfil ${perfilForm.nome} criado com sucesso!`);
    }
    setPerfilDialog(false);
    carregarPerfis();
  };

  const confirmarExclusaoPerfil = async () => {
    if (!perfilExcluir) return;
    const { error } = await supabase.from('perfis').delete().eq('id', perfilExcluir.id);
    if (error) toast.error(error.message);
    else { toast.success('Perfil excluído.'); carregarPerfis(); }
    setPerfilExcluir(null);
  };

  // ---------- permissões ----------
  const [perfilSel, setPerfilSel] = useState<string>('');
  const [rascunho, setRascunho] = useState<Record<string, boolean>>({});
  const [salvandoPerms, setSalvandoPerms] = useState(false);

  useEffect(() => {
    if (!perfilSel && perfis.length) setPerfilSel(perfis[0].id);
  }, [perfis, perfilSel]);

  useEffect(() => {
    if (!perfilSel) return;
    const atual: Record<string, boolean> = {};
    MODULOS.forEach((m) => {
      atual[m.key] = permissoes.some((p) => p.perfil_id === perfilSel && p.modulo === m.key && p.permitido);
    });
    setRascunho(atual);
  }, [perfilSel, permissoes]);

  const todasMarcadas = useMemo(() => MODULOS.every((m) => rascunho[m.key]), [rascunho]);

  const salvarPermissoes = async () => {
    if (!perfilSel) return;
    setSalvandoPerms(true);
    const rows = MODULOS.map((m) => ({ perfil_id: perfilSel, modulo: m.key, permitido: !!rascunho[m.key] }));
    const { error } = await supabase.from('perfil_permissoes').upsert(rows, { onConflict: 'perfil_id,modulo' });
    setSalvandoPerms(false);
    if (error) return toast.error('Não foi possível salvar as permissões. Tente novamente.');
    toast.success('Permissões atualizadas com sucesso!');
    carregarPerfis();
  };

  const nomePerfil = (id: string) => perfis.find((p) => p.id === id)?.nome || '—';

  return (
    <div className="flex min-h-screen bg-[#0F0F0F]">
      <Sidebar user={sessionStorage.getItem('nl_user') || 'Sócio'} />
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bronze/10 rounded-[1px]"><Users size={20} className="text-bronze" /></div>
            <p className="text-[10px] text-bronze uppercase tracking-[0.4em] font-bold">Módulo Administrativo · NL OS</p>
          </div>
          <h1 className="text-4xl font-cormorant italic text-white">Usuários e Permissões</h1>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">Cadastro de usuários, perfis de acesso e permissões por módulo</p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-none h-auto gap-1">
            {[
              { v: 'usuarios', l: 'Usuários' },
              { v: 'perfis', l: 'Perfis' },
              { v: 'permissoes', l: 'Permissões' },
            ].map((t) => (
              <TabsTrigger key={t.v} value={t.v}
                className="rounded-none px-6 py-2.5 text-[10px] uppercase tracking-widest data-[state=active]:bg-bronze data-[state=active]:text-white">
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* USUÁRIOS */}
          <TabsContent value="usuarios">
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase flex items-center gap-2">
                  <Users size={16} className="text-bronze" /> Usuários do sistema
                </h3>
                <Button onClick={abrirNovo} className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold">
                  <Plus size={12} className="mr-2" /> Novo usuário
                </Button>
              </div>

              {loading ? (
                <p className="text-[10px] text-white/30 uppercase tracking-widest animate-pulse">Carregando usuários...</p>
              ) : usuarios.length === 0 ? (
                <p className="text-[10px] text-white/20 uppercase tracking-widest">Nenhum usuário cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {usuarios.map((u) => (
                    <div key={u.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="space-y-1">
                        <p className="text-[12px] text-white font-medium">{u.profile?.nome || u.email}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{u.email}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {u.roles.includes('admin') && (
                            <Badge className="rounded-none bg-bronze text-white text-[8px] uppercase tracking-widest">Administrador</Badge>
                          )}
                          {u.perfis.map((pid) => (
                            <Badge key={pid} variant="outline" className="rounded-none border-white/15 text-white/50 text-[8px] uppercase tracking-widest">
                              {nomePerfil(pid)}
                            </Badge>
                          ))}
                          {u.profile?.ativo === false && (
                            <Badge variant="outline" className="rounded-none border-red-500/40 text-red-400 text-[8px] uppercase tracking-widest">Inativo</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)}
                          className="h-8 w-8 p-0 text-white/40 hover:text-bronze hover:bg-bronze/10 rounded-none" title="Editar">
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExcluir(u)}
                          className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-none" title="Excluir">
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* PERFIS */}
          <TabsContent value="perfis">
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase flex items-center gap-2">
                  <ShieldCheck size={16} className="text-bronze" /> Perfis de acesso
                </h3>
                <Button
                  onClick={() => { setPerfilEdit(null); setPerfilForm({ nome: '', descricao: '' }); setPerfilDialog(true); }}
                  className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold">
                  <Plus size={12} className="mr-2" /> Criar novo perfil
                </Button>
              </div>

              {perfis.length === 0 ? (
                <p className="text-[10px] text-white/20 uppercase tracking-widest">Nenhum perfil cadastrado</p>
              ) : (
                <div className="space-y-3">
                  {perfis.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <p className="text-[12px] text-white font-medium">{p.nome}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{p.descricao || 'Sem descrição'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm"
                          onClick={() => { setPerfilEdit(p); setPerfilForm({ nome: p.nome, descricao: p.descricao || '' }); setPerfilDialog(true); }}
                          className="h-8 w-8 p-0 text-white/40 hover:text-bronze hover:bg-bronze/10 rounded-none" title="Editar">
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={p.sistema} onClick={() => setPerfilExcluir(p)}
                          className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-none disabled:opacity-20"
                          title={p.sistema ? 'Perfil padrão do sistema' : 'Excluir'}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* PERMISSÕES */}
          <TabsContent value="permissoes">
            <div className={cardCls}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase flex items-center gap-2">
                  <KeyRound size={16} className="text-bronze" /> Permissões por perfil
                </h3>
                <div className="flex items-center gap-3">
                  <Select value={perfilSel} onValueChange={setPerfilSel}>
                    <SelectTrigger className="w-[220px] rounded-none bg-white/5 border-white/10 text-white text-[10px] uppercase tracking-widest">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none bg-[#1A1816] border-white/10 text-white">
                      {perfis.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost"
                    onClick={() => setRascunho(Object.fromEntries(MODULOS.map((m) => [m.key, !todasMarcadas])))}
                    className="rounded-none text-[10px] uppercase tracking-widest text-white/50 hover:text-bronze hover:bg-bronze/10">
                    {todasMarcadas ? 'Limpar todas' : 'Selecionar todas'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                {MODULOS.map((m) => (
                  <label key={m.key}
                    className="flex items-start gap-4 border-b border-white/5 py-4 cursor-pointer hover:bg-white/[0.02] px-2 transition-colors">
                    <Checkbox
                      checked={!!rascunho[m.key]}
                      onCheckedChange={(v) => setRascunho((r) => ({ ...r, [m.key]: !!v }))}
                      className="mt-0.5 rounded-none border-white/20 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                    />
                    <div>
                      <p className="text-[11px] text-white font-medium uppercase tracking-widest">{m.nome}</p>
                      <p className="text-[10px] text-white/35 mt-1">{m.descricao}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={salvarPermissoes} disabled={!perfilSel || salvandoPerms}
                  className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold">
                  {salvandoPerms && <Loader2 size={12} className="mr-2 animate-spin" />} Salvar alterações
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* DIALOG USUÁRIO */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="rounded-none bg-[#1A1816] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cormorant italic text-2xl">
              {editando ? 'Editar usuário' : 'Cadastrar usuário'}
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest text-white/35">
              Preencha os dados e defina os perfis de acesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Nome completo</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Leandro Henrique" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">E-mail</Label>
              <Input type="email" value={form.email} disabled={!!editando}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nome@nlarquitetos.com.br" className={`${inputCls} disabled:opacity-40`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-white/50">
                  {editando ? 'Nova senha (opcional)' : 'Senha'}
                </Label>
                <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-white/50">Confirmar senha</Label>
                <Input type="password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} className={inputCls} />
              </div>
            </div>
            <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed">
              A senha deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula e um número.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-white/50">Telefone (opcional)</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-white/50">Nascimento (opcional)</Label>
                <Input type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Perfis de acesso</Label>
              <div className="space-y-2 border border-white/10 p-4">
                {perfis.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={form.perfis.includes(p.id)}
                      onCheckedChange={(v) => setForm((f) => ({
                        ...f,
                        perfis: v ? [...f.perfis, p.id] : f.perfis.filter((x) => x !== p.id),
                      }))}
                      className="rounded-none border-white/20 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                    />
                    <span className="text-[11px] text-white/70">{p.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border border-white/10 p-4">
              <div>
                <p className="text-[11px] text-white uppercase tracking-widest">Administrador do sistema</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Acesso total, inclusive ao painel administrativo</p>
              </div>
              <Switch checked={form.admin} onCheckedChange={(v) => setForm({ ...form, admin: v })} />
            </div>

            {editando && (
              <div className="flex items-center justify-between border border-white/10 p-4">
                <p className="text-[11px] text-white uppercase tracking-widest">Usuário ativo</p>
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setUserDialog(false)}
              className="rounded-none text-[10px] uppercase tracking-widest text-white/50 hover:text-white">Cancelar</Button>
            <Button onClick={salvarUsuario} disabled={salvando}
              className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold">
              {salvando && <Loader2 size={12} className="mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG PERFIL */}
      <Dialog open={perfilDialog} onOpenChange={setPerfilDialog}>
        <DialogContent className="rounded-none bg-[#1A1816] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cormorant italic text-2xl">
              {perfilEdit ? 'Editar perfil' : 'Criar novo perfil'}
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest text-white/35">
              Defina o nome e a descrição do perfil de acesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Nome do perfil</Label>
              <Input value={perfilForm.nome} onChange={(e) => setPerfilForm({ ...perfilForm, nome: e.target.value })}
                placeholder="Ex.: Coordenador de obra" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Descrição</Label>
              <Textarea value={perfilForm.descricao} onChange={(e) => setPerfilForm({ ...perfilForm, descricao: e.target.value })}
                placeholder="O que este perfil pode fazer no sistema" className={`${inputCls} min-h-[90px]`} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPerfilDialog(false)}
              className="rounded-none text-[10px] uppercase tracking-widest text-white/50 hover:text-white">Cancelar</Button>
            <Button onClick={salvarPerfil}
              className="rounded-none bg-bronze hover:bg-bronze/80 text-white uppercase tracking-widest text-[10px] font-bold">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÕES */}
      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent className="rounded-none bg-[#1A1816] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cormorant italic text-2xl">Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] text-white/50">
              Tem certeza que deseja excluir o usuário “{excluir?.profile?.nome || excluir?.email}”? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none bg-transparent border-white/10 text-white/60 text-[10px] uppercase tracking-widest">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusaoUsuario}
              className="rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-widest">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!perfilExcluir} onOpenChange={(o) => !o && setPerfilExcluir(null)}>
        <AlertDialogContent className="rounded-none bg-[#1A1816] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cormorant italic text-2xl">Excluir perfil</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] text-white/50">
              Tem certeza que deseja excluir o perfil “{perfilExcluir?.nome}”? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none bg-transparent border-white/10 text-white/60 text-[10px] uppercase tracking-widest">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusaoPerfil}
              className="rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-widest">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GestaoUsuarios;
