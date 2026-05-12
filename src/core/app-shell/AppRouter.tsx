import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrescriptionDashboard } from '../../modules/FitJourney2/components/PrescriptionDashboard';
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

  // Se o usuário não está logado, forçar redirecionamento (Supabase Auth lida com isso se integrado, mas aqui garantimos)
  // Nota: O AuthProvider já deve ter tentado recuperar a sessão.

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-black">
        {/* Toggle de Emergência (Mode Selector) */}
        <div className="fixed bottom-6 right-6 z-[100]">
          <button 
            onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-2xl transition-all active:scale-95 ${
              mode === 'V1' 
              ? 'bg-green-600 border-green-400 text-white animate-pulse' 
              : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            MODO: {mode}
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
