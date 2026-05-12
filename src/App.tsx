import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';

// Inicialização do QueryClient para TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const CompatibilityFallback = ({ onSwitch }: { onSwitch: () => void }) => (
  <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center relative">
    <div className="absolute top-4 right-4">
      <button 
        onClick={onSwitch}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
      >
        Mudar para BETA (V2)
      </button>
    </div>
    <h1 className="text-4xl font-bold mb-4">FitJourney 1.0 (PRODUÇÃO)</h1>
    <p className="text-xl text-slate-400 max-w-2xl">
      Você está no modo de compatibilidade. Como as pastas legadas foram removidas na branch V2, 
      esta tela serve como placeholder para o sistema antigo.
    </p>
  </div>
);

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  // Se estiver no modo V1, renderiza o fallback de compatibilidade
  if (mode === 'V1') {
    return <CompatibilityFallback onSwitch={() => setMode('V2')} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="relative">
            <div className="fixed top-6 right-6 z-50">
              <button 
                onClick={() => setMode('V1')}
                className="px-4 py-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium transition-colors text-white"
              >
                Voltar para V1
              </button>
            </div>
            
            <BrowserRouter>
              <Routes>
                {/* Rota principal do Dashboard V2 */}
                <Route path="/" element={<PrescriptionDashboard />} />
                <Route path="/dashboard" element={<PrescriptionDashboard />} />
                
                {/* Placeholder para Auth - redireciona para o dashboard por enquanto */}
                <Route path="/auth" element={<Navigate to="/" replace />} />
                
                {/* Fallback para qualquer outra rota */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
          <Toaster position="top-right" closeButton richColors />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
