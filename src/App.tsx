import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Index from "./pages/Index.tsx";
...
import ProjetoDocumentos from "./pages/ProjetoDocumentos.tsx";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <SidebarProvider>
      <Toaster />

    <Sonner />
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/proposta/:tipo" element={<PropostaVisualizacao />} />
        <Route path="/p/:tipo/:slug" element={<PropostaCliente />} />
        <Route path="/pre-briefing" element={<BriefingPublic />} />
        <Route path="/pre-briefing/:token" element={<BriefingPublic />} />
        <Route path="/satisfacao/:token" element={<PesquisaSatisfacao />} />
        <Route path="/cliente/:slug" element={<PaginaCliente />} />
        <Route path="/dropbox-callback" element={<DropboxCallback />} />

        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<ClientesLista />} />
          <Route path="/clientes/novo" element={<ClienteFicha />} />
          <Route path="/clientes/:id" element={<ClienteFicha />} />
          <Route path="/pipeline" element={<Index />} />
          <Route path="/financeiro" element={<FinanceiroGeral />} />
          <Route path="/financeiro/base" element={<BaseFinanceira />} />
          <Route path="/projetos/horas" element={<ControleHoras />} />
          <Route path="/propostas/biblioteca" element={<BibliotecaServicos />} />
          <Route path="/projetos/gestao" element={<GestaoProjetos />} />
          <Route path="/projetos/detalhe/:id" element={<ProjetoDetalhe />} />
          <Route path="/projetos/:id/financeiro" element={<ProjetoFinanceiro />} />
          <Route path="/projetos/:id/documentos" element={<ProjetoDocumentos />} />

          
          <Route path="/propostas/documentos" element={<DocumentosContratos />} />
          <Route path="/propostas/tracking" element={<PropostasTracking />} />
          <Route path="/calculadora" element={<CalculadoraList />} />
          <Route path="/calculadora/nova-proposta" element={<PropostaCalculadora />} />
          <Route path="/calculadora/:proposalId" element={<PropostaCalculadora />} />
          <Route path="/proposta/calculadora/:proposalId" element={<Navigate to="/calculadora/:proposalId" replace />} />
          <Route path="/sistema/configuracoes" element={<ConfiguracoesSistema />} />
          <Route path="/marketing/satisfacao" element={<SatisfacaoDashboard />} />
          <Route path="/marketing/ia" element={<MarketingIA />} />
          <Route path="/scripts-atendimento" element={<ScriptsAtendimento />} />
          <Route path="/apresentacao/:id" element={<ModoApresentacao />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </SidebarProvider>
  </QueryClientProvider>
);


export default App;
