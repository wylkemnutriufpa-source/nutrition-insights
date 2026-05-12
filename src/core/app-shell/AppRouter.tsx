import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrescriptionDashboard } from '../../modules/FitJourney2/components/PrescriptionDashboard';
import { PatientDietView } from '../../modules/FitJourney2/components/PatientDietView';
import { useAuth } from '../../lib/auth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'nutritionist' | 'personal' | 'lojista' | 'patient';

export const AppRouter = () => {
  const { user, loading: loadingAuth } = useAuth();
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoadingRoles(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      setRoles((data?.map((r: any) => r.role) || []) as AppRole[]);
      setLoadingRoles(false);
    }
    fetchRoles();
  }, [user]);

  if (loadingAuth || loadingRoles) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-widest">Iniciando FitJourney...</div>;
  }

  const isAdmin = roles.includes('admin');
  const isPro = isAdmin || roles.includes('nutritionist') || roles.includes('personal') || roles.includes('lojista');
  // Paciente puro = só tem role patient (ou nenhuma role e não é pro)
  const isPatientOnly = !isPro && roles.includes('patient');

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-black">
        {/* Toggle V1/V2 — apenas para profissionais */}
        {isPro && (
          <div className="fixed bottom-6 right-6 z-[100]">
            <button
              onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
              className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-2xl transition-all active:scale-95 bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
            >
              {mode === 'V1' ? 'Mudar para BETA (V2)' : 'Voltar para V1 (Estável)'}
            </button>
          </div>
        )}

        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <div className="p-20 text-white">Tela de Login Placeholder</div>} />

          <Route
            path="/"
            element={
              !user
                ? <Navigate to="/auth" replace />
                : isPro
                  ? <PrescriptionDashboard />
                  : isPatientOnly
                    ? <PatientDietView />
                    : <PrescriptionDashboard /> /* fallback: sem role definida → trata como pro/admin para não travar */
            }
          />
          <Route path="/dashboard" element={user ? (isPro ? <PrescriptionDashboard /> : <PatientDietView />) : <Navigate to="/auth" replace />} />
          <Route path="/my-diet" element={user ? <PatientDietView /> : <Navigate to="/auth" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
