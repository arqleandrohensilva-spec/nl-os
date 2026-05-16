import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle2, XCircle, RefreshCcw, Download, Sparkles, Video, Calendar, Upload, Check, Copy, ChevronRight, Clock, Star, Trash2, Search, Filter, ChevronDown, ChevronUp, History } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
  const [personaExamples, setPersonaExamples] = useState("");

  // New states for Reels
  const [reelsSubject, setReelsSubject] = useState("");
  const [reelsDuration, setReelsDuration] = useState<'30S' | '60S' | '90S'>('30S');
  const [reelsFormat, setReelsFormat] = useState<'EDUCATIVO' | 'BASTIDOR' | 'AUTORIDADE'>('EDUCATIVO');
  const [reelsImage, setReelsImage] = useState<string | null>(null);
  const reelsImageRef = useRef<HTMLInputElement>(null);
  const [reelsResult, setReelsResult] = useState<{ gancho: string, desenvolvimento: string[], cta: string } | null>(null);
  
  // New states for Calendar
  const [calendarMonth, setCalendarMonth] = useState("Junho 2026");
  const [calendarProjects, setCalendarProjects] = useState("");
  const [calendarFocus, setCalendarFocus] = useState<'CAPTAÇÃO' | 'AUTORIDADE' | 'EDUCAÇÃO' | 'PORTFÓLIO'>('CAPTAÇÃO');
  const [calendarResult, setCalendarResult] = useState<Array<{ numero: number, tipo: string, tema: string, formato: string, descricao: string, gancho: string }>>([]);
  const [expandingContent, setExpandingContent] = useState<number | null>(null);
  const [expandedResults, setExpandedResults] = useState<Record<number, { linkedin?: string, blog?: string }>>({});
  const [showExpansionModal, setShowExpansionModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", content: "", type: "" as 'linkedin' | 'blog' });

  // History states
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'TODOS' | 'LEGENDA' | 'REEL' | 'CALENDARIO'>('TODOS');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);



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
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('historico_conteudo')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveToHistory = async (tipo: 'legenda' | 'reel' | 'calendario', conteudo: any, inputUsado?: string, postTypeUsed?: string) => {
    try {
      const { data, error } = await supabase
        .from('historico_conteudo')
        .insert([{
          tipo,
          conteudo,
          input_usado: inputUsado,
          post_type: postTypeUsed,
          favorito: false
        }])
        .select();

      if (error) throw error;
      
      setHistoryItems(prev => [data[0], ...prev]);
      toast({
        title: "Salvo no histórico",
        description: "O conteúdo foi guardado na sua biblioteca."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar no histórico",
        description: error.message
      });
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('historico_conteudo')
        .update({ favorito: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setHistoryItems(prev => prev.map(item => 
        item.id === id ? { ...item, favorito: !currentStatus } : item
      ));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao favoritar",
        description: error.message
      });
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('historico_conteudo')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item excluído",
        description: "O conteúdo foi removido do histórico."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message
      });
    }
  };

  const useAgain = (item: any) => {
    if (item.tipo === 'legenda') {
      setCaptionDescription(item.input_usado || "");
      if (item.post_type) setPostType(item.post_type as any);
      setCaptionOptions(item.conteudo.opcoes || [item.conteudo]);
      setActiveTab('captions');
    } else if (item.tipo === 'reel') {
      setReelsSubject(item.input_usado || "");
      setReelsResult(item.conteudo);
      setActiveTab('reels');
    }
    
    toast({
      title: "Conteúdo carregado",
      description: "As configurações foram restauradas na aba correspondente."
    });
  };


  const fetchGuidelines = async () => {
    const { data } = await supabase
      .from('diretrizes_marketing')
      .select('content, persona_examples')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setGuidelines(data.content || "");
      setPersonaExamples(data.persona_examples || "");
    } else {
      const defaultGuidelines = `Nunca usar: casa dos sonhos, projeto dos sonhos, lindo, incrível, luxo, exclusivo.
Sempre mencionar processo técnico antes de resultado estético.
Tom: condutor, técnico, direto. Máximo 5 linhas visíveis no Instagram.
Hashtags: máximo 10, sempre #NLArquitetos e #ProjetoExecutivo.`;
      setGuidelines(defaultGuidelines);
      setPersonaExamples("");
    }
  };

  const saveGuidelines = async () => {
    const { error } = await supabase
      .from('diretrizes_marketing')
      .insert([{ content: guidelines, persona_examples: personaExamples }]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar diretrizes",
        description: error.message
      });
    } else {
      toast({
        title: "Configurações salvas",
        description: "As diretrizes e exemplos de persona foram atualizados."
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

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const generateContent = async (type: string, skipImage: boolean = false) => {
    setGenerating(true);
    if (!skipImage) setGeneratedContent("");
    if (type === 'captions') setCaptionOptions([]);
    if (type === 'reels') setReelsResult(null);
    if (type === 'calendar') setCalendarResult([]);
    
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
        const currentImage = skipImage ? null : captionImage;
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

${personaExamples ? `EXEMPLOS DE POSTS QUE DERAM CERTO (SIGA ESTE ESTILO E VOZ):
${personaExamples}` : ""}

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
${currentImage ? "Analise a imagem do projeto enviada e baseie a legenda no que você vê — materiais, detalhes construtivos, decisões técnicas visíveis." : ""}
${captionDescription ? `Contexto fornecido: ${captionDescription}` : ""}
`;

        const aiResponse = await supabase.functions.invoke('ai-advisor', {
          body: { 
            prompt, 
            systemPrompt, 
            image: currentImage, 
            model: "anthropic/claude-sonnet-4-20250514",
            json: true
          }
        });

        if (aiResponse.error) {
          const errorMsg = aiResponse.error.message || JSON.stringify(aiResponse.error);
          if (currentImage && !skipImage) {
            console.warn("Falha ao processar com imagem, tentando sem imagem...", errorMsg);
            return generateContent(type, true);
          }
          throw new Error(`Erro na API: ${errorMsg}`);
        }

        if (aiResponse.data?.choices?.[0]?.message?.content) {
          const content = aiResponse.data.choices[0].message.content;
          try {
            const extractJSON = (text: string) => {
              try { return JSON.parse(text); } catch (e) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                  try { return JSON.parse(match[0]); } catch (e2) { return null; }
                }
                return null;
              }
            };

            const parsed = extractJSON(content);
            if (parsed && parsed.opcoes) {
              setCaptionOptions(parsed.opcoes);
            } else {
              setGeneratedContent(content);
            }
          } catch (e) {
            setGeneratedContent(content);
          }
        } else if (aiResponse.data?.error) {
          throw new Error(`Erro na IA: ${aiResponse.data.error.message || aiResponse.data.error}`);
        } else {
          throw new Error("Falha ao gerar legendas.");
        }
      } else if (type === 'reels') {
        const currentImage = skipImage ? null : reelsImage;
        const systemPrompt = `Você é o CMO virtual da NL Arquitetos, escritório de arquitetura premium em São José dos Campos. Gere um roteiro de Reel para Instagram.

TOM OBRIGATÓRIO: técnico, condutor, direto — nunca romântico ou emocional. O Reel deve educar ou demonstrar autoridade técnica, não vender.

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (primeiros 3 segundos): frase que para o scroll. Direto, específico, provoca curiosidade técnica.
2. DESENVOLVIMENTO: sequência de ${reelsDuration} segundos. Tópicos numerados, cada um com ação visual sugerida entre colchetes.
3. CTA FINAL: próximo passo claro. Nunca "manda mensagem agora", sempre algo que demonstra método.

REGRAS:
- Duração: ${reelsDuration}
- Formato: ${reelsFormat}
- Sem "casa dos sonhos", "lindo", "incrível", "luxo"
- Sempre processo técnico antes de resultado estético
- CTA deve ser consultivo, nunca pressão de venda

DIRETRIZES DA NL: ${guidelines}

${personaExamples ? `EXEMPLOS DE ESTILO (SIGA ESTA VOZ):
${personaExamples}` : ""}

BASE DE CONHECIMENTO (CONTEXTO):
${contextContent}`;

        const prompt = `
${currentImage ? "Analise a imagem enviada e use os elementos visuais do ambiente — materiais, iluminação, detalhes construtivos — para tornar o roteiro mais específico e autêntico." : ""}
Assunto: ${reelsSubject}`;

        const aiResponse = await supabase.functions.invoke('ai-advisor', {
          body: { 
            prompt, 
            systemPrompt, 
            image: currentImage,
            model: "anthropic/claude-sonnet-4-20250514",
            json: true
          }
        });

        if (aiResponse.error) {
          const errorMsg = aiResponse.error.message || JSON.stringify(aiResponse.error);
          if (currentImage && !skipImage) {
            console.warn("Falha ao processar Reel com imagem, tentando sem imagem...", errorMsg);
            return generateContent(type, true);
          }
          throw new Error(`Erro na API: ${errorMsg}`);
        }

        if (aiResponse.data?.choices?.[0]?.message?.content) {
          const content = aiResponse.data.choices[0].message.content;
          try {
            const extractJSON = (text: string) => {
              try { return JSON.parse(text); } catch (e) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                  try { return JSON.parse(match[0]); } catch (e2) { return null; }
                }
                return null;
              }
            };

            const parsed = extractJSON(content);
            if (parsed) {
              setReelsResult(parsed);
            } else {
              setGeneratedContent(content);
            }
          } catch (e) {
            setGeneratedContent(content);
          }
        } else if (aiResponse.data?.error) {
          throw new Error(`Erro na IA: ${aiResponse.data.error.message || aiResponse.data.error}`);
        } else {
          throw new Error("Falha ao gerar roteiro de Reel.");
        }
      } else if (type === 'calendar') {
        const systemPrompt = `Você é o CMO virtual da NL Arquitetos, escritório de arquitetura premium em São José dos Campos. Gere o calendário de conteúdo para Instagram do mês de ${calendarMonth}.

ESTRUTURA OBRIGATÓRIA — 4 semanas:
- Semana 1: PROJETO — mostrar um projeto real com decisão técnica
- Semana 2: EDUCAÇÃO — ensinar algo sobre processo, compatibilização ou planejamento
- Semana 3: AUTORIDADE — posicionamento, método, diferencial técnico da NL
- Semana 4: CAPTAÇÃO — conteúdo que gera contato qualificado

PARA CADA SEMANA:
- Tema específico
- Formato sugerido (Feed, Reel, Carrossel ou Story)
- Descrição do que mostrar/falar
- Gancho sugerido (frase de abertura)

TOM OBRIGATÓRIO: técnico, condutor, direto. Nunca romântico. Nunca "casa dos sonhos".
Foco do mês: ${calendarFocus}
Projetos disponíveis: ${calendarProjects}

DIRETRIZES DA NL: ${guidelines}

BASE DE CONHECIMENTO (CONTEXTO):
${contextContent}

Retorne APENAS JSON válido neste formato:
{
  "semanas": [
    {
      "numero": 1,
      "tipo": "PROJETO",
      "tema": "...",
      "formato": "...",
      "descricao": "...",
      "gancho": "..."
    },
    {
      "numero": 2,
      "tipo": "EDUCAÇÃO",
      "tema": "...",
      "formato": "...",
      "descricao": "...",
      "gancho": "..."
    },
    {
      "numero": 3,
      "tipo": "AUTORIDADE",
      "tema": "...",
      "formato": "...",
      "descricao": "...",
      "gancho": "..."
    },
    {
      "numero": 4,
      "tipo": "CAPTAÇÃO",
      "tema": "...",
      "formato": "...",
      "descricao": "...",
      "gancho": "..."
    }
  ]
}`;

        const prompt = `Gere o calendário de conteúdo para o mês de ${calendarMonth}.`;

        const aiResponse = await supabase.functions.invoke('ai-advisor', {
          body: { 
            prompt, 
            systemPrompt, 
            model: "anthropic/claude-sonnet-4-20250514",
            json: true
          }
        });

        if (aiResponse.error) {
          throw new Error(`Erro na API: ${aiResponse.error.message || JSON.stringify(aiResponse.error)}`);
        }

        if (aiResponse.data?.choices?.[0]?.message?.content) {
          const content = aiResponse.data.choices[0].message.content;
          try {
            const extractJSON = (text: string) => {
              try { return JSON.parse(text); } catch (e) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                  try { return JSON.parse(match[0]); } catch (e2) { return null; }
                }
                return null;
              }
            };

            const parsed = extractJSON(content);
            if (parsed && parsed.semanas) {
              setCalendarResult(parsed.semanas);
              // Auto-save calendar
              saveToHistory('calendario', parsed, `Calendário de ${calendarMonth} - Foco: ${calendarFocus}`);
            } else {
              setGeneratedContent(content);
            }
          } catch (e) {
            setGeneratedContent(content);
          }
        } else if (aiResponse.data?.error) {
          throw new Error(`Erro na IA: ${aiResponse.data.error.message || aiResponse.data.error}`);
        } else {
          throw new Error("Falha ao gerar calendário.");
        }
      } else {
        const systemPrompt = `Você é um especialista em marketing para arquitetos, focado no escritório NL Arquitetos.\nDIRETRIZES RÁPIDAS:\n${guidelines}\nBASE DE CONHECIMENTO:\n${contextContent}`;
        const prompt = `Gere conteúdo seguindo o estilo da NL Arquitetos.\nInformações: ${userInput}`;
        const aiResponse = await supabase.functions.invoke('ai-advisor', { 
          body: { prompt, systemPrompt }
        });

        if (aiResponse.error) {
          throw new Error(`Erro na API: ${aiResponse.error.message || JSON.stringify(aiResponse.error)}`);
        }

        if (aiResponse.data?.choices?.[0]?.message?.content) {
          setGeneratedContent(aiResponse.data.choices[0].message.content);
        } else if (aiResponse.data?.error) {
          throw new Error(`Erro na IA: ${aiResponse.data.error.message || aiResponse.data.error}`);
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

  const expandContent = async (index: number, originalCaption: string, targetFormat: 'linkedin' | 'blog') => {
    console.log(`Iniciando expansão multicanal: ${targetFormat} para index ${index}`);
    setExpandingContent(index);
    try {
      let systemPrompt = "";
      let prompt = "";

      if (targetFormat === 'linkedin') {
        systemPrompt = `Você é o CMO virtual da NL Arquitetos. Transforme a legenda do Instagram abaixo em um post profissional para LinkedIn.

DIFERENÇAS DO LINKEDIN:
- Tom mais formal e analítico que o Instagram
- Pode ter até 3000 caracteres — desenvolva mais o raciocínio técnico
- Sem hashtags excessivas — máximo 5, relevantes para arquitetura e mercado imobiliário
- Abertura forte que gere curiosidade profissional
- Terminar com pergunta ou reflexão que incentive comentários
- Público: incorporadoras, investidores, profissionais do setor, clientes de alto padrão

TOM OBRIGATÓRIO: técnico, condutor, autoridade — nunca romantizado.
DIRETRIZES NL: ${guidelines}`;

        prompt = `LEGENDA INSTAGRAM ORIGINAL:
${originalCaption}

Gere o post completo para LinkedIn.`;
      } else {
        systemPrompt = `Você é o CMO virtual da NL Arquitetos. Transforme a legenda do Instagram abaixo em um artigo técnico para o blog da NL, otimizado para SEO local.

ESTRUTURA DO ARTIGO:
- Título SEO: incluir "arquiteto São José dos Campos" ou "projeto residencial SJC" naturalmente
- Introdução: 2 parágrafos expandindo o conceito técnico da legenda
- Desenvolvimento: 3 seções com subtítulos — aprofunda a decisão técnica, o processo e o resultado
- Conclusão: reforça o método NL e CTA para contato
- Meta description: 155 caracteres para SEO

TOM: técnico, educativo, autoridade local. Nunca romantizado.
PALAVRAS-CHAVE NATURAIS: arquiteto SJC, projeto executivo, compatibilização técnica, São José dos Campos.
DIRETRIZES NL: ${guidelines}`;

        prompt = `LEGENDA ORIGINAL:
${originalCaption}

Gere o artigo completo com título, subtítulos e meta description.`;
      }

      console.log("Chamando Edge Function ai-advisor...");
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { 
          prompt, 
          systemPrompt,
          model: "claude-sonnet-4-20250514"
        }
      });

      if (error) {
        console.error("Erro no invoke da função:", error);
        throw new Error(error.message || "Falha na comunicação com a Edge Function");
      }

      if (data?.error) {
        console.error("Erro retornado pela IA:", data.error);
        throw new Error(data.error.message || "Erro interno da IA");
      }

      if (data?.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        console.log("Conteúdo gerado com sucesso");
        
        setExpandedResults(prev => ({
          ...prev,
          [index]: { ...prev[index], [targetFormat]: content }
        }));

        setModalContent({
          title: targetFormat === 'linkedin' ? "Post para LinkedIn" : "Artigo de Blog (SEO)",
          content: content,
          type: targetFormat
        });
        setShowExpansionModal(true);

        toast({
          title: "Expansão concluída",
          description: `O conteúdo para ${targetFormat === 'linkedin' ? 'LinkedIn' : 'Blog'} foi gerado.`
        });
      } else {
        throw new Error("Resposta da IA veio vazia ou em formato inesperado");
      }
    } catch (error: any) {
      console.error("Erro geral na expansão:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro na expansão", 
        description: error.message || "Ocorreu um erro inesperado ao gerar o conteúdo."
      });
    } finally {
      setExpandingContent(null);
    }
  };

  const handleCreateContent = (tema: string, formato: string) => {
    if (formato.toLowerCase().includes('reel')) {
      setReelsSubject(tema);
      setActiveTab('reels');
    } else {
      setCaptionDescription(tema);
      setActiveTab('captions');
    }
    toast({
      title: "Tema transferido",
      description: `O tema "${tema}" foi enviado para a aba de ${formato.toLowerCase().includes('reel') ? 'Reels' : 'Legendas'}.`
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Calendário de Conteúdo - ${calendarMonth}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Foco: ${calendarFocus}`, 14, 30);
    
    const tableData = calendarResult.map(s => [
      `Semana ${s.numero}`,
      s.tipo,
      s.tema,
      s.formato,
      s.gancho
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['Semana', 'Tipo', 'Tema', 'Formato', 'Gancho']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 115, 85] } // Bronze #8B7355
    });

    doc.save(`calendario-${calendarMonth.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast({ title: "Sucesso", description: "PDF exportado com sucesso." });
  };

  const typeColors: Record<string, string> = {
    'PROJETO': '#8B7355',
    'PORTFÓLIO': '#8B7355',
    'EDUCAÇÃO': '#4A7355',
    'AUTORIDADE': '#3A5A7A',
    'CAPTAÇÃO': '#7A4A3A'
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
            <TabsTrigger value="history" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-white/40 uppercase text-[10px] tracking-widest font-bold px-6">
              <History className="w-3 h-3 mr-2" /> Histórico
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
                    <Textarea value={guidelines} onChange={(e) => setGuidelines(e.target.value)} placeholder="Ex: Nunca usar 'casa dos sonhos', focar no técnico..." className="min-h-[150px] bg-white/[0.03] border-white/5 text-white/80 text-sm focus:border-bronze/50 resize-none rounded-none" />
                    
                    <div className="pt-4 border-t border-white/5">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 block flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-bronze" /> Treinamento de Persona (Exemplos)
                      </label>
                      <Textarea 
                        value={personaExamples} 
                        onChange={(e) => setPersonaExamples(e.target.value)} 
                        placeholder="Cole aqui 2 ou 3 posts que performaram muito bem para a IA aprender seu estilo único..." 
                        className="min-h-[200px] bg-white/[0.03] border-white/5 text-white/80 text-sm focus:border-bronze/50 resize-none rounded-none" 
                      />
                    </div>

                    <Button className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[11px] font-bold tracking-[0.2em]" onClick={saveGuidelines}>Salvar Configurações</Button>
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
                      <input type="file" ref={captionImageRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (re) => {
                            const compressed = await compressImage(re.target?.result as string);
                            setCaptionImage(compressed);
                          };
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
                        
                        <div className="pt-4 border-t border-white/5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold">Expansão Multicanal Premium</span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[9px] uppercase tracking-widest bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white disabled:opacity-100 disabled:text-[#AAAAAA] rounded-none flex items-center gap-2 transition-all duration-200"
                                onClick={() => {
                                  console.log("Clique no botão LinkedIn", { index, legenda: option.legenda });
                                  expandContent(index, option.legenda, 'linkedin');
                                }}
                                disabled={expandingContent !== null}
                              >
                                {expandingContent === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3 text-bronze" />}
                                {expandingContent === index ? "Gerando..." : "Expandir para LinkedIn"}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[9px] uppercase tracking-widest bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white disabled:opacity-100 disabled:text-[#AAAAAA] rounded-none flex items-center gap-2 transition-all duration-200"
                                onClick={() => {
                                  console.log("Clique no botão Blog", { index, legenda: option.legenda });
                                  expandContent(index, option.legenda, 'blog');
                                }}
                                disabled={expandingContent !== null}
                              >
                                {expandingContent === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3 text-bronze" />}
                                {expandingContent === index ? "Gerando..." : "Criar Artigo de Blog"}
                              </Button>
                            </div>
                          </div>

                          {expandedResults[index] && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                              {expandedResults[index].linkedin && (
                                <div className="bg-white/[0.02] p-4 border border-white/5 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] text-bronze uppercase tracking-widest font-bold">Post para LinkedIn</label>
                                    <Button variant="ghost" size="sm" className="h-6 text-[8px] text-white/40 hover:text-white" onClick={() => { navigator.clipboard.writeText(expandedResults[index].linkedin!); toast({ title: "Copiado", description: "Post LinkedIn copiado." }); }}>COPIAR</Button>
                                  </div>
                                  <div className="text-[12px] text-white/70 whitespace-pre-wrap italic font-light leading-relaxed">{expandedResults[index].linkedin}</div>
                                </div>
                              )}
                              {expandedResults[index].blog && (
                                <div className="bg-white/[0.02] p-4 border border-white/5 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] text-bronze uppercase tracking-widest font-bold">Artigo de Blog (SEO)</label>
                                    <Button variant="ghost" size="sm" className="h-6 text-[8px] text-white/40 hover:text-white" onClick={() => { navigator.clipboard.writeText(expandedResults[index].blog!); toast({ title: "Copiado", description: "Artigo de Blog copiado." }); }}>COPIAR</Button>
                                  </div>
                                  <div className="text-[12px] text-white/70 whitespace-pre-wrap italic font-light leading-relaxed">{expandedResults[index].blog}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                          <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 h-8" onClick={() => saveToHistory('legenda', option, captionDescription, postType)}><Star className="w-3 h-3 text-bronze" /> Salvar</Button>
                          <Button variant="ghost" size="sm" className="text-bronze hover:text-bronze/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 h-8" onClick={() => { navigator.clipboard.writeText(`${option.legenda}\n\n${option.hashtags}`); toast({ title: "Copiado", description: `Opção ${index + 1} copiada.` }); }}><Copy className="w-3 h-3" /> Copiar Legenda</Button>
                        </div>
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

          <TabsContent value="reels" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="bg-white/[0.02] border-white/5 rounded-none">
                  <CardHeader className="p-6 border-b border-white/5">
                    <CardTitle className="text-xl font-cormorant text-white uppercase tracking-tight">Geração de Roteiro de Reel</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">REFERÊNCIA VISUAL (opcional)</label>
                      <input 
                        type="file" 
                        ref={reelsImageRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              const compressed = await compressImage(re.target?.result as string);
                              setReelsImage(compressed);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                      <div 
                        onClick={() => reelsImageRef.current?.click()} 
                        className="group relative h-40 border-2 border-dashed border-white/10 hover:border-bronze/50 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                      >
                        {reelsImage ? (
                          <>
                            <img src={reelsImage} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white text-[10px] font-bold uppercase tracking-widest">Alterar Imagem</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-white/20 mb-2 group-hover:text-bronze/50 transition-colors" />
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                              Arraste uma foto do ambiente ou clique para selecionar
                            </p>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-white/20 italic">A IA usa a imagem para contextualizar o roteiro com os detalhes reais do projeto.</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">ASSUNTO DO REEL</label>
                      <Textarea 
                        value={reelsSubject} 
                        onChange={(e) => setReelsSubject(e.target.value)} 
                        placeholder="Ex: Mostrar o processo de compatibilização técnica antes da obra começar..." 
                        className="min-h-[120px] bg-white/[0.03] border-white/5 text-white focus:border-bronze/50 rounded-none text-sm" 
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">DURAÇÃO</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['30S', '60S', '90S'] as const).map((duration) => (
                          <Button 
                            key={duration} 
                            variant="outline" 
                            className={`rounded-none text-[10px] font-bold tracking-widest h-10 transition-all duration-200 ${reelsDuration === duration ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white'}`} 
                            onClick={() => setReelsDuration(duration)}
                          >
                            {duration}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">FORMATO</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['EDUCATIVO', 'BASTIDOR', 'AUTORIDADE'] as const).map((format) => (
                          <Button 
                            key={format} 
                            variant="outline" 
                            className={`rounded-none text-[10px] font-bold tracking-widest h-10 transition-all duration-200 ${reelsFormat === format ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white'}`} 
                            onClick={() => setReelsFormat(format)}
                          >
                            {format}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12" 
                      onClick={() => generateContent('reels')} 
                      disabled={generating || !reelsSubject}
                    >
                      {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando Base...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Roteiro com IA</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                {reelsResult ? (
                  <Card className="bg-white/[0.02] border-bronze/30 rounded-none overflow-hidden">
                    <CardContent className="p-0 flex flex-col">
                      <div className="p-6 space-y-2">
                        <label className="text-[10px] text-bronze uppercase tracking-widest font-bold">[ GANCHO — primeiros 3 segundos ]</label>
                        <div className="text-white text-sm font-medium leading-relaxed">{reelsResult.gancho}</div>
                      </div>
                      
                      <div className="h-[1px] bg-[#3A3836] w-full" />
                      
                      <div className="p-6 space-y-4">
                        <label className="text-[10px] text-bronze uppercase tracking-widest font-bold">[ DESENVOLVIMENTO ]</label>
                        <div className="space-y-3">
                          {reelsResult.desenvolvimento.map((item, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="text-bronze font-bold text-sm">{i + 1}.</span>
                              <p className="text-white/80 text-sm leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-[1px] bg-[#3A3836] w-full" />

                      <div className="p-6 space-y-2">
                        <label className="text-[10px] text-bronze uppercase tracking-widest font-bold">[ CTA FINAL ]</label>
                        <div className="text-white/80 text-sm leading-relaxed">{reelsResult.cta}</div>
                      </div>

                      <div className="p-6 pt-0 flex flex-col gap-2">
                        <Button 
                          variant="outline"
                          className="w-full border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-none uppercase text-[10px] font-bold tracking-widest h-10" 
                          onClick={() => saveToHistory('reel', reelsResult, reelsSubject)}
                        >
                          <Star className="w-3 h-3 mr-2 text-bronze" /> Salvar no Histórico
                        </Button>
                        <Button 
                          className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[10px] font-bold tracking-widest h-10" 
                          onClick={() => {
                            const fullText = `GANCHO:\n${reelsResult.gancho}\n\nDESENVOLVIMENTO:\n${reelsResult.desenvolvimento.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nCTA FINAL:\n${reelsResult.cta}`;
                            navigator.clipboard.writeText(fullText);
                            toast({ title: "Copiado", description: "Roteiro completo copiado." });
                          }}
                        >
                          Copiar Roteiro Completo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20"><Video size={32} /></div>
                    <h3 className="text-white/40 text-lg font-cormorant mb-2">Pronto para gerar</h3>
                    <p className="text-white/20 text-xs max-w-[200px]">Preencha os campos ao lado e clique em gerar para ver o roteiro.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="bg-white/[0.02] border-white/5 rounded-none">
                  <CardHeader className="p-6 border-b border-white/5">
                    <CardTitle className="text-xl font-cormorant text-white uppercase tracking-tight">Geração de Calendário de Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">MÊS DE REFERÊNCIA</label>
                      <Select value={calendarMonth} onValueChange={setCalendarMonth}>
                        <SelectTrigger className="w-full bg-white/[0.03] border-white/5 text-white rounded-none h-10">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-white/10 text-white rounded-none">
                          {[
                            "Janeiro 2026", "Fevereiro 2026", "Março 2026", "Abril 2026", 
                            "Maio 2026", "Junho 2026", "Julho 2026", "Agosto 2026", 
                            "Setembro 2026", "Outubro 2026", "Novembro 2026", "Dezembro 2026"
                          ].map((m) => (
                            <SelectItem key={m} value={m} className="focus:bg-bronze focus:text-white cursor-pointer">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">PROJETOS PARA DESTACAR (opcional)</label>
                      <Textarea 
                        value={calendarProjects} 
                        onChange={(e) => setCalendarProjects(e.target.value)} 
                        placeholder="Ex: Apartamento Moema 120m², Casa SJC estilo contemporâneo..." 
                        className="min-h-[100px] bg-white/[0.03] border-white/5 text-white focus:border-bronze/50 rounded-none text-sm" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">FOCO DO MÊS</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['CAPTAÇÃO', 'AUTORIDADE', 'EDUCAÇÃO', 'PORTFÓLIO'] as const).map((focus) => (
                          <Button 
                            key={focus} 
                            variant="outline" 
                            className={`rounded-none text-[10px] font-bold tracking-widest h-10 transition-all duration-200 ${calendarFocus === focus ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'bg-[#2A2826] border-[#4A4846] text-[#AAAAAA] hover:bg-[#3A3836] hover:border-[#8B7355] hover:text-white'}`} 
                            onClick={() => setCalendarFocus(focus)}
                          >
                            {focus}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12" 
                      onClick={() => generateContent('calendar')} 
                      disabled={generating}
                    >
                      {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando Calendário...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Calendário com IA</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 pb-8">
                {calendarResult.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {calendarResult.map((semana) => (
                        <Card key={semana.numero} 
                          className="bg-white/[0.02] border-white/10 rounded-none overflow-hidden relative"
                          style={{ borderLeft: `4px solid ${typeColors[semana.tipo] || '#8B7355'}` }}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <Badge className="bg-white/5 text-white/60 text-[8px] font-bold tracking-widest rounded-none px-2 py-0.5 border border-white/10 uppercase">
                                {semana.tipo}
                              </Badge>
                              <span className="text-[10px] text-white/20 font-bold">SEMANA {semana.numero}</span>
                            </div>
                            
                            <div className="space-y-1">
                              <h4 className="text-white text-sm font-medium leading-tight">{semana.tema}</h4>
                              <p className="text-bronze text-[10px] uppercase tracking-wider font-bold">{semana.formato}</p>
                            </div>

                            <p className="text-white/40 text-[10px] italic leading-relaxed line-clamp-2">"{semana.gancho}"</p>

                            <Button 
                              variant="ghost" 
                              className="w-full justify-between p-0 h-auto text-[9px] font-bold tracking-widest text-white/60 hover:text-bronze transition-colors group"
                              onClick={() => handleCreateContent(semana.tema, semana.formato)}
                            >
                              <span>→ CRIAR CONTEÚDO</span>
                              <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <Button 
                        className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[10px] font-bold tracking-widest h-12"
                        onClick={exportToPDF}
                      >
                        <Download size={16} className="mr-2" /> Exportar Pauta PDF
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full border-white/10 text-white/40 hover:bg-white/5 rounded-none uppercase text-[9px] font-bold tracking-widest h-10"
                        onClick={() => {
                          const fullText = calendarResult.map(s => `SEMANA ${s.numero} — ${s.tipo}\nTema: ${s.tema}\nFormato: ${s.formato}\nDescrição: ${s.descricao}\nGancho: ${s.gancho}`).join('\n\n');
                          navigator.clipboard.writeText(fullText);
                          toast({ title: "Copiado", description: "Pauta completa copiada para a área de transferência." });
                        }}
                      >
                        <Copy size={12} className="mr-2" /> Copiar Pauta Texto
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20"><Calendar size={32} /></div>
                    <h3 className="text-white/40 text-lg font-cormorant mb-2">Pronto para gerar</h3>
                    <p className="text-white/20 text-xs max-w-[200px]">Selecione o mês e o foco para gerar o seu planejamento estratégico.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-6 outline-none">
            <Card className="bg-white/[0.02] border-white/5 rounded-none">
              <CardHeader className="p-6 border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input 
                        placeholder="Buscar no histórico..." 
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white rounded-none h-10 focus:border-bronze/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="favorites" 
                        checked={showOnlyFavorites}
                        onCheckedChange={(checked) => setShowOnlyFavorites(checked as boolean)}
                        className="border-white/20 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                      />
                      <label htmlFor="favorites" className="text-[10px] text-white/40 uppercase font-bold tracking-widest cursor-pointer">Apenas favoritos</label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {(['TODOS', 'LEGENDA', 'REEL', 'CALENDARIO'] as const).map((type) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryFilter(type)}
                        className={`rounded-none text-[9px] font-bold tracking-widest px-4 h-8 ${historyFilter === type ? 'bg-bronze text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-bronze animate-spin mb-4" />
                    <p className="text-white/40 text-sm font-cormorant">Carregando sua biblioteca...</p>
                  </div>
                ) : historyItems.filter(item => {
                  const matchesFilter = historyFilter === 'TODOS' || item.tipo.toUpperCase() === historyFilter;
                  const matchesFavorite = !showOnlyFavorites || item.favorito;
                  const searchLower = historySearch.toLowerCase();
                  const matchesSearch = !historySearch || 
                    (item.input_usado?.toLowerCase().includes(searchLower)) ||
                    (item.tipo.toLowerCase().includes(searchLower)) ||
                    (JSON.stringify(item.conteudo).toLowerCase().includes(searchLower));
                  return matchesFilter && matchesFavorite && matchesSearch;
                }).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full mb-4 text-white/20">
                      <History size={32} />
                    </div>
                    <h3 className="text-white/40 text-lg font-cormorant mb-2">Nenhum conteúdo encontrado</h3>
                    <p className="text-white/20 text-xs max-w-[250px]">
                      {historySearch || showOnlyFavorites || historyFilter !== 'TODOS' 
                        ? "Tente ajustar seus filtros para encontrar o que procura."
                        : "Sua biblioteca ainda está vazia. Gere legendas, reels ou calendários para começar a construir seu histórico."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {historyItems.filter(item => {
                      const matchesFilter = historyFilter === 'TODOS' || item.tipo.toUpperCase() === historyFilter;
                      const matchesFavorite = !showOnlyFavorites || item.favorito;
                      const searchLower = historySearch.toLowerCase();
                      const matchesSearch = !historySearch || 
                        (item.input_usado?.toLowerCase().includes(searchLower)) ||
                        (item.tipo.toLowerCase().includes(searchLower)) ||
                        (JSON.stringify(item.conteudo).toLowerCase().includes(searchLower));
                      return matchesFilter && matchesFavorite && matchesSearch;
                    }).map((item) => (
                      <Card key={item.id} className="bg-white/[0.03] border-white/5 hover:border-bronze/30 transition-all duration-300 rounded-none overflow-hidden group flex flex-col">
                        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5">
                          <Badge variant="outline" className="bg-bronze/10 border-bronze/20 text-bronze text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-none">
                            {item.tipo}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleFavorite(item.id, item.favorito)}
                              className={`transition-colors ${item.favorito ? 'text-bronze' : 'text-white/20 hover:text-white/40'}`}
                            >
                              <Star size={16} fill={item.favorito ? "currentColor" : "none"} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-white/10 hover:text-red-400 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-[#1A1A1A] border-white/10 rounded-none">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white font-cormorant">Excluir do Histórico?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-white/60">
                                    Esta ação não pode ser desfeita. O conteúdo será removido permanentemente da sua biblioteca.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-none">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteHistoryItem(item.id)} className="bg-red-500/80 hover:bg-red-500 text-white rounded-none">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                          <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                            {formatDate(item.created_at)}
                          </p>
                          <h4 className="text-white text-sm font-bold line-clamp-1">{item.input_usado || "Sem descrição"}</h4>
                          
                          <div className={`text-white/50 text-[11px] leading-relaxed italic font-light ${expandedHistoryId === item.id ? '' : 'line-clamp-3'}`}>
                            {item.tipo === 'legenda' ? (item.conteudo.legenda || item.conteudo.opcoes?.[0]?.legenda) : 
                             item.tipo === 'reel' ? item.conteudo.gancho : 
                             `Calendário para ${item.input_usado}`}
                          </div>

                          {expandedHistoryId === item.id && (
                            <div className="pt-4 mt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                              {item.tipo === 'legenda' && (
                                <div className="space-y-2">
                                  <p className="text-white/80 text-[12px] whitespace-pre-wrap">{item.conteudo.legenda || item.conteudo.opcoes?.[0]?.legenda}</p>
                                  <p className="text-bronze text-[11px]">{item.conteudo.hashtags || item.conteudo.opcoes?.[0]?.hashtags}</p>
                                </div>
                              )}
                              {item.tipo === 'reel' && (
                                <div className="space-y-3 text-[12px]">
                                  <p className="text-bronze font-bold uppercase tracking-widest text-[9px]">Gancho:</p>
                                  <p className="text-white/80">{item.conteudo.gancho}</p>
                                  <p className="text-bronze font-bold uppercase tracking-widest text-[9px]">Desenvolvimento:</p>
                                  <ul className="list-disc pl-4 text-white/60 space-y-1">
                                    {item.conteudo.desenvolvimento?.map((d: string, i: number) => <li key={i}>{d}</li>)}
                                  </ul>
                                  <p className="text-bronze font-bold uppercase tracking-widest text-[9px]">CTA:</p>
                                  <p className="text-white/80">{item.conteudo.cta}</p>
                                </div>
                              )}
                              {item.tipo === 'calendario' && (
                                <div className="space-y-3">
                                  {item.conteudo.semanas?.map((s: any) => (
                                    <div key={s.numero} className="p-2 bg-white/5 border-l-2 border-bronze">
                                      <p className="text-[9px] font-bold text-bronze uppercase">S{s.numero}: {s.tipo}</p>
                                      <p className="text-white/80 text-[11px] font-medium">{s.tema}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-4 mt-auto flex flex-col gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                              className="w-full text-white/40 hover:text-white hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest h-8 rounded-none"
                            >
                              {expandedHistoryId === item.id ? <><ChevronUp size={12} className="mr-2" /> RECOLHER</> : <><ChevronDown size={12} className="mr-2" /> VER COMPLETO</>}
                            </Button>
                            <Button 
                              onClick={() => useAgain(item)}
                              className="w-full bg-bronze/10 text-bronze hover:bg-bronze hover:text-white text-[9px] font-bold uppercase tracking-widest h-8 rounded-none transition-all duration-300"
                            >
                              USAR NOVAMENTE
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={showExpansionModal} onOpenChange={setShowExpansionModal}>
          <DialogContent className="bg-[#1A1A1A] border-bronze/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto rounded-none">
            <DialogHeader className="border-b border-white/5 pb-4 mb-4">
              <DialogTitle className="text-xl font-cormorant font-bold uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-bronze" /> {modalContent.title}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {modalContent.type === 'linkedin' ? 'Post otimizado para networking profissional.' : 'Artigo técnico otimizado para SEO local.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-white/80 text-sm whitespace-pre-wrap font-light leading-relaxed bg-white/[0.02] p-6 border border-white/5 italic">
                {modalContent.content}
              </div>
              <Button 
                className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-xs font-bold tracking-[0.2em] h-12"
                onClick={() => {
                  navigator.clipboard.writeText(modalContent.content);
                  toast({
                    title: "Copiado",
                    description: `${modalContent.title} copiado com sucesso.`
                  });
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar para a Área de Transferência
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MarketingIA;
