import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import BaseFinanceira from "./pages/BaseFinanceira.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import ControleHoras from "./pages/ControleHoras.tsx";
import BibliotecaServicos from "./pages/BibliotecaServicos.tsx";
import PropostasTracking from "./pages/PropostasTracking.tsx";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/financeiro/base" element={<ProtectedRoute><BaseFinanceira /></ProtectedRoute>} />
        <Route path="/projetos/horas" element={<ProtectedRoute><ControleHoras /></ProtectedRoute>} />
        <Route path="/propostas/biblioteca" element={<ProtectedRoute><BibliotecaServicos /></ProtectedRoute>} />


        <Route path="/propostas/tracking" element={<ProtectedRoute><PropostasTracking /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
