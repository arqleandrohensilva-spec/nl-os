import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import BaseFinanceira from "./pages/BaseFinanceira.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import ControleHoras from "./pages/ControleHoras.tsx";
import BibliotecaServicos from "./pages/BibliotecaServicos.tsx";
import PropostasTracking from "./pages/PropostasTracking.tsx";
import PropostaVisualizacao from "./pages/PropostaVisualizacao.tsx";
import GestaoProjetos from "./pages/GestaoProjetos.tsx";
import ProjetoDetalhe from "./pages/ProjetoDetalhe.tsx";
import FinanceiroProjetos from "./pages/FinanceiroProjetos.tsx";
import DocumentosContratos from "./pages/DocumentosContratos.tsx";
import DropboxCallback from "./pages/DropboxCallback.tsx";
import ConfiguracoesSistema from "./pages/ConfiguracoesSistema.tsx";
import BriefingPublic from "./pages/BriefingPublic.tsx";
import SatisfacaoDashboard from "./pages/SatisfacaoDashboard.tsx";
import PesquisaSatisfacao from "./pages/PesquisaSatisfacao.tsx";
import MarketingIA from "./pages/MarketingIA.tsx";
import ScriptsAtendimento from "./pages/ScriptsAtendimento.tsx";
import ModoApresentacao from "./pages/ModoApresentacao.tsx";
import PaginaCliente from "./pages/PaginaCliente.tsx";
import PropostaCliente from "./pages/PropostaCliente.tsx";
import PropostaCalculadora from "./pages/PropostaCalculadora.tsx";
import CalculadoraList from "./pages/CalculadoraList.tsx";
import ClientesLista from "./pages/ClientesLista.tsx";
import ClienteFicha from "./pages/ClienteFicha.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/financeiro/base" element={<BaseFinanceira />} />
          <Route path="/projetos/horas" element={<ControleHoras />} />
          <Route path="/propostas/biblioteca" element={<BibliotecaServicos />} />
          <Route path="/projetos/gestao" element={<GestaoProjetos />} />
          <Route path="/projetos/detalhe/:id" element={<ProjetoDetalhe />} />
          <Route path="/financeiro/projetos" element={<FinanceiroProjetos />} />
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
  </QueryClientProvider>
);

export default App;
