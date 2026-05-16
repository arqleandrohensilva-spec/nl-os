import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle2, XCircle, RefreshCcw, Download, Sparkles, Video, Calendar, Upload, Check } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";

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
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionImageRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const { toast } = useToast();

  // New states for captions
  const [captionImage, setCaptionImage] = useState<string | null>(null);
  const [captionDescription, setCaptionDescription] = useState("");
  const [postType, setPostType] = useState<'FEED' | 'REEL' | 'STORY' | 'CARROSSEL'>('FEED');
  const [captionFocus, setCaptionFocus] = useState<'TÉCNICO' | 'PROCESSO' | 'RESULTADO' | 'EDUCATIVO'>('TÉCNICO');
  const [captionOptions, setCaptionOptions] = useState<Array<{ legenda: string, hashtags: string }>>([]);

  // New states for Reels
  const [reelsSubject, setReelsSubject] = useState("");
  const [reelsDuration, setReelsDuration] = useState<'30S' | '60S' | '90S'>('30S');
  const [reelsFormat, setReelsFormat] = useState<'EDUCATIVO' | 'BASTIDOR' | 'AUTORIDADE'>('EDUCATIVO');
  const [reelsResult, setReelsResult] = useState<{ gancho: string, desenvolvimento: string[], cta: string } | null>(null);

  const DROPBOX_PATH = '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/Base de Conhecimentos';

  const DEFAULT_DOCUMENTS = [
    { name: "Tom de Voz NL", fileName: "Tom de Voz NL" },
    { name: "Identidade Cromática", fileName: "Manual de ID Cromática" },
    { name: "Manual de Tipografia", fileName: "Manuais de Tipografia" },
    { name: "Perfil do Cliente (Carlos)", fileName: "Meu Cliente (NL)" },
    { name: "Scripts de Atendimento", fileName: "Scripts - NL" },
    { name: "Pré-briefing por Linha", fileName: "Pre Briefing - NL" }
  ];

  useEffect(() => {
    fetchKnowledgeBase();
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    const { data } = await supabase
      .from('diretrizes_marketing')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setGuidelines(data.content);
    } else {
      const defaultGuidelines = `Nunca usar: casa dos sonhos, projeto dos sonhos, lindo, incrível, luxo, exclusivo.
Sempre mencionar processo técnico antes de resultado estético.
Tom: condutor, técnico, direto. Máximo 5 linhas visíveis no Instagram.
Hashtags: máximo 10, sempre #NLArquitetos e #ProjetoExecutivo.`;
      setGuidelines(defaultGuidelines);
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
      const response = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'list', path: DROPBOX_PATH }
      });

      if (response.error) throw new Error(response.error.message || response.error);

      const dropboxFiles = response.data?.entries || response.data?.files || [];

      const { data: statusData, error: statusError } = await supabase
        .from('base_conhecimento')
        .select('*');

      if (statusError) throw statusError;

      const mergedFiles = dropboxFiles
        .filter((df: any) => df['.tag'] === 'file' || df.name)
        .map((df: any) => {
          const path = df.path_lower || df.path || "";
          const dbFile = statusData?.find(sf => sf.file_path === path);
          return {
            id: dbFile?.id,
            file_path: path,
            file_name: df.name,
            is_active: dbFile ? dbFile.is_active : true,
            server_modified: df.server_modified || df.client_modified,
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
          .from('base_conhecimento')
          .update({ is_active: newStatus })
          .eq('id', file.id);
      } else {
        await supabase
          .from('base_conhecimento')
          .insert([{ 
            file_path: file.file_path, 
            file_name: file.file_name, 
            is_active: newStatus 
          }]);
      }
      setFiles(files.map(f => f.file_path === file.file_path ? { ...f, is_active: newStatus } : f));
      toast({ title: `Documento ${newStatus ? 'ativado' : 'desativado'}`, description: `${file.file_name} foi atualizado.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao alterar status", description: error.message });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFileType) return;

    setUploading(selectedFileType);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = (e.target?.result as string).split(',')[1];
        try {
          const { error } = await supabase.functions.invoke('dropbox-proxy', {
            body: { action: 'upload', path: `${DROPBOX_PATH}/${file.name}`, content: base64Content }
          });
          if (error) throw error;
          const path = `${DROPBOX_PATH}/${file.name}`.toLowerCase();
          await supabase.from('base_conhecimento').upsert({ file_path: path, file_name: file.name, is_active: true }, { onConflict: 'file_path' });
          toast({ title: "Arquivo enviado", description: `${file.name} foi carregado.` });
          fetchKnowledgeBase();
        } catch (err: any) {
          toast({ variant: "destructive", title: "Erro no upload", description: err.message });
        } finally {
          setUploading(null);
          setSelectedFileType(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no processamento", description: error.message });
      setUploading(null);
    }
  };

  const triggerUpload = (fileName: string) => {
    setSelectedFileType(fileName);
    fileInputRef.current?.click();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const generateContent = async (type: string) => {
    setGenerating(true);
    setGeneratedContent("");
    if (type === 'captions') setCaptionOptions([]);
    if (type === 'reels') setReelsResult(null);
    
    try {
      const activeFiles = files.filter(f => f.is_active);
      const priority = ["Scripts - NL", "Meu Cliente (NL)", "Copy (NL)", "Manual de ID Cromática", "Pre Briefing - NL", "Manuais de Tipografia"];
      activeFiles.sort((a, b) => {
        const idxA = priority.findIndex(p => a.file_name.includes(p));
        const idxB = priority.findIndex(p => b.file_name.includes(p));
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      let contextContent = "";
      for (const file of activeFiles) {
        try {
          const { data } = await supabase.functions.invoke('dropbox-proxy', {
            body: { action: 'download', path: file.file_path }
          });
          if (data) {
            const text = await data.text();
            contextContent += `\n--- CONTEXTO: ${file.file_name} ---\n${text}\n`;
          }
        } catch (e) {
          console.error(`Error downloading ${file.file_name}:`, e);
        }
      }

      if (type === 'captions') {
        const systemPrompt = `Você é o CMO virtual da NL Arquitetos, escritório de arquitetura premium em São José dos Campos. Gere 3 opções de legenda para Instagram.

TOM OBRIGATÓRIO: técnico, condutor, centrado no processo — nunca romântico ou emocional. Explique a decisão técnica por trás do projeto, não a estética.

REGRAS:
- Máximo 5 linhas visíveis antes do "ver mais"
- Sem "casa dos sonhos", "lindo", "incrível", "luxo", "exclusivo"
- Sempre mencionar processo técnico antes de resultado estético
- Hashtags: máximo 10, sempre incluir #NLArquitetos e #ProjetoExecutivo
- Tipo de post: ${postType}
- Foco: ${captionFocus}

DIRETRIZES DA NL: ${guidelines}

BASE DE CONHECIMENTO (CONTEXTO):
${contextContent}

Retorne APENAS JSON válido neste formato:
{
  "opcoes": [
    {"legenda": "texto completo", "hashtags": "#tag1 #tag2..."},
    {"legenda": "texto completo", "hashtags": "#tag1 #tag2..."},
    {"legenda": "texto completo", "hashtags": "#tag1 #tag2..."}
  ]
}`;

        const prompt = `
${captionImage ? "Analise a imagem do projeto enviada e baseie a legenda no que você vê — materiais, detalhes construtivos, decisões técnicas visíveis." : ""}
${captionDescription ? `Contexto fornecido: ${captionDescription}` : ""}
`;

        const aiResponse = await supabase.functions.invoke('ai-advisor', {
          body: { 
            prompt, 
            systemPrompt, 
            image: captionImage, 
            model: "anthropic/claude-3-5-sonnet-20240620",
            json: true
          }
        });

        if (aiResponse.data?.choices?.[0]?.message?.content) {
          const content = aiResponse.data.choices[0].message.content;
          try {
            const parsed = JSON.parse(content);
            if (parsed.opcoes) {
              setCaptionOptions(parsed.opcoes);
            } else {
              setGeneratedContent(content);
            }
          } catch (e) {
            setGeneratedContent(content);
          }
        } else {
          throw new Error("Falha ao gerar legendas.");
        }
      } else {
        const typeLabels: Record<string, string> = {
          'reels': 'Roteiro para Reels',
          'calendar': 'Calendário de Conteúdo Semanal'
        };
        const systemPrompt = `Você é um especialista em marketing para arquitetos, focado no escritório NL Arquitetos.\nDIRETRIZES RÁPIDAS:\n${guidelines}\nBASE DE CONHECIMENTO:\n${contextContent}`;
        const prompt = `Gere ${typeLabels[type]} seguindo o estilo da NL Arquitetos.\nInformações do post: ${userInput}`;
        const aiResponse = await supabase.functions.invoke('ai-advisor', { body: { prompt, systemPrompt } });
        if (aiResponse.data?.choices?.[0]?.message?.content) {
          setGeneratedContent(aiResponse.data.choices[0].message.content);
        } else {
          throw new Error("Falha ao gerar conteúdo.");
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na geração", description: error.message });
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
          <Button variant="outline" className="border-bronze/30 text-bronze hover:bg-bronze/10" onClick={fetchKnowledgeBase} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Atualizar Base
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-none h-12">
            <TabsTrigger value="knowledge-base" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6">
              <FileText className="w-3 h-3 mr-2" /> Base de Conhecimento
            </TabsTrigger>
            <TabsTrigger value="captions" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6">
              <Sparkles className="w-3 h-3 mr-2" /> Legendas
            </TabsTrigger>
            <TabsTrigger value="reels" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6">
              <Video className="w-3 h-3 mr-2" /> Reels
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6">
              <Calendar className="w-3 h-3 mr-2" /> Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge-base" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-cormorant font-bold text-white mb-1 uppercase tracking-tight">DOCUMENTOS DA NL</h2>
                  <p className="text-white/40 text-xs mb-6">A IA usa estes documentos como contexto em todo conteúdo gerado</p>
                  <div className="space-y-3">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
                    {DEFAULT_DOCUMENTS.map((doc) => {
                      const file = files.find(f => f.file_name.toLowerCase().includes(doc.fileName.toLowerCase()));
                      const isActive = file?.is_active;
                      const isPending = !file;
                      return (
                        <Card key={doc.name} className="bg-white/[0.02] border-white/5 hover:border-bronze/30 transition-all duration-300 rounded-none">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded ${isPending ? 'bg-white/5 text-white/20' : 'bg-bronze/10 text-bronze'}`}>
                                <FileText size={20} />
                              </div>
                              <div>
                                <h3 className="text-white text-sm font-bold">{doc.name}</h3>
                                {file && <p className="text-[10px] text-white/40 uppercase tracking-tighter">{formatSize(file.size)} · {formatDate(file.server_modified)}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 min-w-[100px] justify-end">
                                {isPending ? (
                                  <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-none flex items-center gap-1">
                                    <div className="w-2 h-2 border border-white/20"></div> PENDENTE
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-none flex items-center gap-1">
                                    <Check size={10} /> ATIVO
                                  </Badge>
                                )}
                              </div>
                              <Button variant="outline" size="sm" className={`rounded-none uppercase text-[10px] font-bold tracking-widest h-8 px-4 ${isPending ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-bronze/10 border-bronze/20 text-bronze hover:bg-bronze/20'}`} onClick={() => triggerUpload(doc.fileName)} disabled={uploading === doc.fileName}>
                                {uploading === doc.fileName ? <Loader2 className="w-3 h-3 animate-spin" /> : isPending ? <><Upload size={12} className="mr-2" /> Upload</> : <><RefreshCcw size={12} className="mr-2" /> Atualizar</>}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <Card className="bg-white/[0.02] border-white/5 rounded-none">
                  <CardHeader className="p-4 border-b border-white/5"><CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Diretrizes Rápidas</CardTitle></CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <Textarea value={guidelines} onChange={(e) => setGuidelines(e.target.value)} placeholder="Insira as diretrizes para a IA..." className="min-h-[250px] bg-white/[0.03] border-white/5 text-white/80 text-sm focus:border-bronze/50 resize-none rounded-none" />
                    <Button className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[11px] font-bold tracking-[0.2em]" onClick={saveGuidelines}>Salvar Diretrizes</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="captions" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="bg-white/[0.02] border-white/5 rounded-none">
                  <CardHeader className="p-6 border-b border-white/5"><CardTitle className="text-xl font-cormorant text-white uppercase tracking-tight">Geração de Legendas</CardTitle></CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">IMAGEM DO PROJETO</label>
                      <input type="file" ref={captionImageRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => setCaptionImage(re.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <div onClick={() => captionImageRef.current?.click()} className="group relative h-40 border-2 border-dashed border-white/10 hover:border-bronze/50 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        {captionImage ? (
                          <><img src={captionImage} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><p className="text-white text-[10px] font-bold uppercase tracking-widest">Alterar Imagem</p></div></>
                        ) : (
                          <><Upload className="w-8 h-8 text-white/20 mb-2 group-hover:text-bronze/50 transition-colors" /><p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-4">Arraste uma foto ou clique para selecionar</p></>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">DESCREVA O PROJETO OU CONTEXTO</label>
                      <Textarea value={captionDescription} onChange={(e) => setCaptionDescription(e.target.value)} placeholder="Ex: Cozinha integrada à sala, revestimento Portobello..." className="min-h-[100px] bg-white/[0.03] border-white/5 text-white focus:border-bronze/50 rounded-none text-sm" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">TIPO DE POST</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['FEED', 'REEL', 'STORY', 'CARROSSEL'] as const).map((type) => (
                          <Button key={type} variant="outline" className={`rounded-none text-[10px] font-bold tracking-widest h-10 transition-all duration-200 ${postType === type ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white'}`} onClick={() => setPostType(type)}>{type}</Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">FOCO</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['TÉCNICO', 'PROCESSO', 'RESULTADO', 'EDUCATIVO'] as const).map((focus) => (
                          <Button key={focus} variant="outline" className={`rounded-none text-[10px] font-bold tracking-widest h-10 transition-all duration-200 ${captionFocus === focus ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white'}`} onClick={() => setCaptionFocus(focus)}>{focus}</Button>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12" onClick={() => generateContent('captions')} disabled={generating || (!captionImage && !captionDescription)}>
                      {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando Base...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Legenda com IA</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                {captionOptions.length > 0 ? (
                  captionOptions.map((option, index) => (
                    <Card key={index} className="bg-white/[0.02] border-white/10 rounded-none relative mt-4 first:mt-0">
                      <div className="absolute -top-3 left-4"><Badge className="bg-bronze text-white text-[10px] font-bold tracking-widest rounded-none border-none">OPÇÃO {index + 1}</Badge></div>
                      <CardContent className="p-6 pt-8 space-y-4">
                        <div className="text-white/80 text-sm whitespace-pre-wrap font-light leading-relaxed">{option.legenda}</div>
                        <div className="text-bronze text-xs font-medium tracking-tight">{option.hashtags}</div>
                        <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-bronze hover:text-bronze/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 h-8" onClick={() => { navigator.clipboard.writeText(`${option.legenda}\n\n${option.hashtags}`); toast({ title: "Copiado", description: `Opção ${index + 1} copiada.` }); }}><RefreshCcw className="w-3 h-3" /> Copiar</Button></div>
                      </CardContent>
                    </Card>
                  ))
                ) : generatedContent ? (
                  <Card className="bg-white/[0.02] border-bronze/30 rounded-none">
                    <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between"><CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Resultado Sugerido</CardTitle></CardHeader>
                    <CardContent className="p-6"><div className="text-white/80 text-sm whitespace-pre-wrap font-light leading-relaxed">{generatedContent}</div></CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20"><Sparkles size={32} /></div>
                    <h3 className="text-white/40 text-lg font-cormorant mb-2">Pronto para gerar</h3>
                    <p className="text-white/20 text-xs max-w-[200px]">Preencha os campos ao lado e clique em gerar para ver as sugestões da IA.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {["reels", "calendar"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-6 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Card className="bg-white/[0.02] border-white/5 rounded-none">
                    <CardHeader className="p-6 border-b border-white/5"><CardTitle className="text-xl font-cormorant text-white uppercase tracking-tight">Geração de {type === 'reels' ? 'Reels' : 'Calendário'}</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">O que você quer postar?</label>
                        <Textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={`Ex: Roteiro para mostrar a iluminação de um living...`} className="min-h-[120px] bg-white/[0.03] border-white/5 text-white focus:border-bronze/50 rounded-none text-sm" />
                      </div>
                      <Button className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12" onClick={() => generateContent(type)} disabled={generating || !userInput}>
                        {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando Base...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                  {generatedContent ? (
                    <Card className="bg-white/[0.02] border-bronze/30 rounded-none">
                      <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Resultado Sugerido</CardTitle>
                        <Button variant="ghost" size="sm" className="text-bronze text-[10px] uppercase font-bold tracking-widest p-0 h-auto" onClick={() => { navigator.clipboard.writeText(generatedContent); toast({ title: "Copiado", description: "Conteúdo copiado." }); }}>Copiar Texto</Button>
                      </CardHeader>
                      <CardContent className="p-6"><div className="text-white/80 text-sm whitespace-pre-wrap font-light leading-relaxed">{generatedContent}</div></CardContent>
                    </Card>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-12 text-center">
                      <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20"><Sparkles size={32} /></div>
                      <h3 className="text-white/40 text-lg font-cormorant mb-2">Pronto para gerar</h3>
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
