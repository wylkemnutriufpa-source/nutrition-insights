import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrescriptionDashboard } from '../../modules/FitJourney2/components/PrescriptionDashboard';
import { CompatibilityFallback } from './CompatibilityFallback';
import { useAuth } from '../../lib/auth';

/**
 * AppRouter - Gestão de Rotas e Estado de Transição V1/V2
 */
export const AppRouter = () => {
  const { user, loading: loadingAuth } = useAuth();
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  if (loadingAuth) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-widest">Iniciando FitJourney...</div>;
  }

  // MODO V1 ATIVO: Renderiza o Fallback de Compatibilidade
  if (mode === 'V1') {
    return <CompatibilityFallback onSwitch={() => setMode('V2')} />;
  }

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-black">
        {/* Toggle de Emergência (Mode Selector) */}
        <div className="fixed bottom-6 right-6 z-[100]">
          <button 
            onClick={() => setMode('V1')}
            className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-2xl transition-all active:scale-95 bg-slate-900 border-slate-700 text-slate-400"
          >
            Voltar para V1
          </button>
        </div>

        <Routes>
          {/* Rotas Públicas */}
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <div className="p-20 text-white">Tela de Login Placeholder (V1 Original Ausente)</div>} />

          {/* Rotas Privadas (Redirecionam para Dashboard V2 por enquanto) */}
          <Route 
            path="/" 
            element={user ? <PrescriptionDashboard /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <PrescriptionDashboard /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/my-diet" 
            element={user ? <PrescriptionDashboard /> : <Navigate to="/auth" replace />} 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
