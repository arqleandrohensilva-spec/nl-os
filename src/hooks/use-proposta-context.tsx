import { createContext, useContext, ReactNode } from 'react';

interface PropostaContextType {
  nome: string;
  tipo: string;
  cidade: string;
  estado: string;
  area: string;
  objetivo: string;
  data: string;
  plano: string;
  valor_executivo: string;
  valor_completo: string;
  validade: string;
}

export const PropostaContext = createContext<PropostaContextType | undefined>(undefined);

export const PropostaProvider = ({ children, value }: { children: ReactNode; value: PropostaContextType }) => {
  return (
    <PropostaContext.Provider value={value}>
      {children}
    </PropostaContext.Provider>
  );
};

export const useProposta = () => {
  const context = useContext(PropostaContext);
  if (context === undefined) {
    throw new Error('useProposta must be used within a PropostaProvider');
  }
  return context;
};
