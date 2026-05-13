import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { FileText, ChevronDown, Download, Upload, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DocumentosContratos = () => {
  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 ml-[230px] p-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">08 · Documentos e Contratos</h1>
          <p className="text-[#8B7355] text-[11px] uppercase tracking-[0.2em] font-bold">BRIEFING · CONTRATOS · ARQUIVOS</p>
        </header>

        <Tabs defaultValue="briefing" className="space-y-6">
          <TabsList className="bg-[#242220] border border-white/10 p-1">
            <TabsTrigger value="briefing" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white">BRIEFING</TabsTrigger>
            <TabsTrigger value="contratos" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white">CONTRATOS</TabsTrigger>
            <TabsTrigger value="arquivos" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white">ARQUIVOS</TabsTrigger>
          </TabsList>

          <TabsContent value="briefing" className="bg-[#242220] p-6 border border-white/10 rounded-lg">
            <p className="text-white/60">Conteúdo do Briefing pré-reunião...</p>
          </TabsContent>

          <TabsContent value="contratos" className="bg-[#242220] p-6 border border-white/10 rounded-lg">
            <p className="text-white/60">Gestão de Contratos...</p>
          </TabsContent>

          <TabsContent value="arquivos" className="bg-[#242220] p-6 border border-white/10 rounded-lg">
            <p className="text-white/60">Organização de arquivos...</p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DocumentosContratos;
