import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { PatientDietView } from './modules/FitJourney2/components/PatientDietView';
import { useAuth } from './lib/auth';
import { supabase } from './integrations/supabase/client';

type AppRole = 'admin' | 'nutritionist' | 'personal' | 'lojista' | 'patient';

export const V2App = () => {
  const { user, loading: loadingAuth } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

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
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-widest text-[10px]">Iniciando FitJourney V2...</div>;
  }

  const isAdmin = roles.includes('admin');
  const isPro = isAdmin || roles.includes('nutritionist') || roles.includes('personal') || roles.includes('lojista');
  const isPatientOnly = !isPro && roles.includes('patient');

  return (
    <div className="relative min-h-screen bg-black">
      <Routes>
        {/* V2 has its own sub-routes, but since it's mounted at /v2/*, these are relative */}
        <Route path="/auth" element={user ? <Navigate to="/v2" replace /> : <div className="p-20 text-white">Tela de Login V2 Placeholder</div>} />

        <Route
          path="/"
          element={
            !user
              ? <Navigate to="/v2/auth" replace />
              : isPro
                ? <PrescriptionDashboard />
                : isPatientOnly
                  ? <PatientDietView />
                  : <PrescriptionDashboard />
          }
        />
        <Route path="/dashboard" element={user ? (isPro ? <PrescriptionDashboard /> : <PatientDietView />) : <Navigate to="/v2/auth" replace />} />
        <Route path="/my-diet" element={user ? <PatientDietView /> : <Navigate to="/v2/auth" replace />} />

        <Route path="*" element={<Navigate to="/v2" replace />} />
      </Routes>
    </div>
  );
};

export default V2App;
