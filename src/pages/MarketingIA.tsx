import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle2, XCircle, RefreshCcw, Download, Sparkles, Video, Calendar } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface KnowledgeBaseFile {
  id?: string;
  file_path: string;
  file_name: string;
  is_active: boolean;
  server_modified?: string;
  size?: number;
}

const MarketingIA = () => {
  const [activeTab, setActiveTab] = useState("knowledge-base");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [guidelines, setGuidelines] = useState("");
  const [userInput, setUserInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const { toast } = useToast();

  const DROPBOX_PATH = '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/Base de Conhecimentos';

  useEffect(() => {
    fetchKnowledgeBase();
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    const { data, error } = await supabase
      .from('diretrizes_marketing')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setGuidelines(data.content);
    }
  };

  const saveGuidelines = async () => {
    const { error } = await supabase
      .from('diretrizes_marketing')
      .insert([{ content: guidelines }]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar diretrizes",
        description: error.message
      });
    } else {
      toast({
        title: "Diretrizes salvas",
        description: "As diretrizes foram atualizadas com sucesso."
      });
    }
  };

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      // 1. List files from Dropbox
      const response = await supabase.functions.invoke('dropbox-proxy', {
        body: { 
          action: 'list_folder',
          path: DROPBOX_PATH
        }
      });

      if (response.error) throw new Error(response.error);

      const dropboxFiles = response.data.entries || [];

      // 2. Fetch active status from Supabase
      const { data: statusData, error: statusError } = await supabase
        .from('knowledge_base_files')
        .select('*');

      if (statusError) throw statusError;

      const mergedFiles = dropboxFiles
        .filter((f: any) => f['.tag'] === 'file')
        .map((df: any) => {
          const dbFile = statusData?.find(sf => sf.file_path === df.path_lower);
          return {
            id: dbFile?.id,
            file_path: df.path_lower,
            file_name: df.name,
            is_active: dbFile ? dbFile.is_active : true, // Default to active
            server_modified: df.server_modified,
            size: df.size
          };
        });

      setFiles(mergedFiles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar base de conhecimento",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFileStatus = async (file: KnowledgeBaseFile) => {
    const newStatus = !file.is_active;
    
    try {
      if (file.id) {
        await supabase
          .from('knowledge_base_files')
          .update({ is_active: newStatus })
          .eq('id', file.id);
      } else {
        await supabase
          .from('knowledge_base_files')
          .insert([{ 
            file_path: file.file_path, 
            file_name: file.file_name, 
            is_active: newStatus 
          }]);
      }
      
      setFiles(files.map(f => f.file_path === file.file_path ? { ...f, is_active: newStatus } : f));
      
      toast({
        title: `Documento ${newStatus ? 'ativado' : 'desativado'}`,
        description: `${file.file_name} ${newStatus ? 'será usado' : 'não será mais usado'} como contexto.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: error.message
      });
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateContent = async (type: string) => {
    setGenerating(true);
    setGeneratedContent("");
    try {
      // 1. Get active files and download their content
      const activeFiles = files.filter(f => f.is_active);
      
      // Sort by priority as requested
      const priority = [
        "Scripts - NL",
        "Meu Cliente (NL)",
        "Copy (NL)",
        "Manual de ID Cromática",
        "Pre Briefing - NL",
        "Manuais de Tipografia"
      ];

      activeFiles.sort((a, b) => {
        const idxA = priority.findIndex(p => a.file_name.includes(p));
        const idxB = priority.findIndex(p => b.file_name.includes(p));
        const valA = idxA === -1 ? 999 : idxA;
        const valB = idxB === -1 ? 999 : idxB;
        return valA - valB;
      });

      let contextContent = "";
      for (const file of activeFiles) {
        try {
          const response = await supabase.functions.invoke('dropbox-proxy', {
            body: { 
              action: 'download',
              path: file.file_path
            }
          });
          
          if (response.data) {
            // For edge function downloads that return a blob, we might need to handle the response differently
            // But based on the provided code snippet:
            const text = await response.data.text();
            contextContent += `\n--- CONTEXTO: ${file.file_name} ---\n${text}\n`;
          }
        } catch (e) {
          console.error(`Error downloading ${file.file_name}:`, e);
        }
      }

      const typeLabels: Record<string, string> = {
        'captions': 'Legenda para Instagram',
        'reels': 'Roteiro para Reels',
        'calendar': 'Calendário de Conteúdo Semanal'
      };

      const systemPrompt = `Você é um especialista em marketing para arquitetos, focado no escritório NL Arquitetos.
Seu objetivo é gerar ${typeLabels[type]} seguindo rigorosamente a Base de Conhecimento e as Diretrizes abaixo.

DIRETRIZES RÁPIDAS:
${guidelines}

BASE DE CONHECIMENTO (CONTEXTO):
${contextContent}

Responda sempre em Português do Brasil. Mantenha o tom de voz definido nos documentos.`;

      const prompt = `Gere ${typeLabels[type]} seguindo o estilo da NL Arquitetos.
      
Informações do post: ${userInput}`;

      const aiResponse = await supabase.functions.invoke('ai-advisor', {
        body: { prompt, systemPrompt }
      });

      if (aiResponse.data?.choices?.[0]?.message?.content) {
        setGeneratedContent(aiResponse.data.choices[0].message.content);
      } else {
        throw new Error("Falha ao gerar conteúdo pela IA.");
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na geração",
        description: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 ml-[230px] p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-cormorant font-bold text-white mb-1">Marketing com IA</h1>
            <p className="text-bronze/60 text-sm uppercase tracking-widest font-bold">Módulo 11 · Inteligência Estratégica</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-bronze/30 text-bronze hover:bg-bronze/10"
              onClick={fetchKnowledgeBase}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              Atualizar Base
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-none h-12">
            <TabsTrigger 
              value="knowledge-base" 
              className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6"
            >
              <FileText className="w-3 h-3 mr-2" />
              Base de Conhecimento
            </TabsTrigger>
            <TabsTrigger 
              value="captions" 
              className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Legendas
            </TabsTrigger>
            <TabsTrigger 
              value="reels" 
              className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6"
            >
              <Video className="w-3 h-3 mr-2" />
              Reels
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6"
            >
              <Calendar className="w-3 h-3 mr-2" />
              Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge-base" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <Card key={i} className="bg-white/[0.02] border-white/5 animate-pulse h-32"></Card>
                    ))
                  ) : (
                    files.map((file) => (
                      <Card key={file.file_path} className="bg-white/[0.02] border-white/5 hover:border-bronze/30 transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-bronze/10 text-bronze rounded">
                                <FileText size={18} />
                              </div>
                              <div>
                                <h3 className="text-white text-sm font-bold truncate max-w-[150px]">{file.file_name}</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                                  {formatDate(file.server_modified)} · {formatSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {file.is_active ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  <CheckCircle2 size={10} /> Ativo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  <XCircle size={10} /> Inativo
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white"
                              onClick={() => toggleFileStatus(file)}
                            >
                              {file.is_active ? "Desativar" : "Ativar"}
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-bronze hover:text-bronze/80 p-0 h-auto"
                              asChild
                            >
                              <a 
                                href="#" 
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const resp = await supabase.functions.invoke('dropbox-proxy', {
                                    body: { action: 'get_temporary_link', path: file.file_path }
                                  });
                                  if (resp.data?.link) window.open(resp.data.link, '_blank');
                                }}
                              >
                                <Download size={14} className="mr-1" />
                                <span className="text-[10px] uppercase font-bold tracking-widest">Baixar</span>
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <Card className="bg-white/[0.02] border-white/5">
                  <CardHeader className="p-4 border-b border-white/5">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Diretrizes Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <Textarea 
                      value={guidelines}
                      onChange={(e) => setGuidelines(e.target.value)}
                      placeholder="Insira as diretrizes para a IA..."
                      className="min-h-[250px] bg-white/[0.03] border-white/5 text-white/80 text-sm focus:border-bronze/50 resize-none rounded-none"
                    />
                    <Button 
                      className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[11px] font-bold tracking-[0.2em]"
                      onClick={saveGuidelines}
                    >
                      Salvar Diretrizes
                    </Button>
                  </CardContent>
                </Card>

                <div className="bg-bronze/5 border border-bronze/20 p-4 rounded-none">
                  <h4 className="text-bronze text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Sparkles size={12} /> Dica do Assistente
                  </h4>
                  <p className="text-white/60 text-[11px] leading-relaxed">
                    A IA utilizará todos os documentos marcados como <strong>ATIVO</strong> e as <strong>DIRETRIZES RÁPIDAS</strong> para garantir que o conteúdo gerado siga o tom de voz e os processos da NL Arquitetos.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {["captions", "reels", "calendar"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-6 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card className="bg-white/[0.02] border-white/5">
                    <CardHeader className="p-6 border-b border-white/5">
                      <CardTitle className="text-xl font-cormorant text-white">Geração de {type === 'captions' ? 'Legendas' : type === 'reels' ? 'Reels' : 'Calendário'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <p className="text-white/60 text-sm">
                        A IA irá consultar sua Base de Conhecimento e aplicar as Diretrizes Rápidas para gerar conteúdo estratégico.
                      </p>
                      
                      <div className="space-y-3">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">O que você quer postar?</label>
                        <Textarea 
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Ex: Foto de obra finalizada em Moema, estilo minimalista..."
                          className="min-h-[120px] bg-white/[0.03] border-white/5 text-white focus:border-bronze/50 rounded-none"
                        />
                      </div>

                      <Button 
                        className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12"
                        onClick={() => generateContent(type)}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Consultando Base...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Gerar com IA
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {generatedContent ? (
                    <Card className="bg-white/[0.02] border-bronze/30">
                      <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Resultado Sugerido</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-bronze text-[10px] uppercase font-bold tracking-widest p-0 h-auto"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedContent);
                            toast({ title: "Copiado", description: "Conteúdo copiado para a área de transferência." });
                          }}
                        >
                          Copiar Texto
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="text-white/80 text-sm whitespace-pre-wrap font-light leading-relaxed">
                          {generatedContent}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-12 text-center">
                      <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20">
                        <Sparkles size={32} />
                      </div>
                      <h3 className="text-white/40 text-lg font-cormorant mb-2">Pronto para gerar</h3>
                      <p className="text-white/20 text-xs max-w-[200px]">
                        Preencha o campo ao lado e clique em gerar para ver a sugestão da IA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default MarketingIA;
