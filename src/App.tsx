/**
 * ══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE PROTECTED — APP BOOTSTRAP
 * ESTABILIZAÇÃO SOBERANA LOCKDOWN
 * NÃO ALTERAR SEM APROVAÇÃO EXPLÍCITA DE GOVERNANÇA
 * ══════════════════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, Suspense, lazy } from 'react';
const PrescriptionDashboard = lazy(() => import('./modules/FitJourney2/components/PrescriptionDashboard').then(m => ({ default: m.PrescriptionDashboard })));
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { SelectionRipple } from '@/components/ui/micro-interactions';
import { useAuth } from './lib/auth';


const App = () => {
  const { isAdmin, isNutritionist, isPersonal, roles, loading } = useAuth();
  
  // FASE 1: Consolidação V3 - O modo operacional é derivado da role, não de toggle manual
  const isProfessional = isAdmin || isNutritionist || isPersonal;
  const mode = isProfessional ? 'V2' : 'V1';

  if (loading) return <PageLoader />;

  return (
    <div className="relative min-h-screen">
      {/* 
        COMPATIBILITY ADAPTER (FASE 1)
        O Switcher flutuante foi removido. 
        O V3 é a única verdade para profissionais.
      */}
      
      <Suspense fallback={<PageLoader />}>
        {mode === 'V1' ? (
          <AppRoutes />
        ) : (
          <div className="min-h-screen bg-black">
            <PrescriptionDashboard />
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default App;
