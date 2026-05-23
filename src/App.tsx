/**
 * ══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE PROTECTED — APP BOOTSTRAP
 * ESTABILIZAÇÃO SOBERANA LOCKDOWN
 * NÃO ALTERAR SEM APROVAÇÃO EXPLÍCITA DE GOVERNANÇA
 * ══════════════════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, Suspense } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { SelectionRipple } from '@/components/ui/micro-interactions';
import { useAuth } from './lib/auth';


const App = () => {
  const { isAdmin, isNutritionist, isPersonal, roles, loading } = useAuth();
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    try {
      const saved = localStorage.getItem('fitjourney_mode');
      // Default to V1 if not set or invalid
      return (saved === 'V1' || saved === 'V2') ? saved as 'V1' | 'V2' : 'V1';
    } catch (e) {
      return 'V1';
    }
  });

  useEffect(() => {
    if (loading) return;
    
    // Safety check: if user is not a professional, they MUST stay in V1
    const isProfessional = isAdmin || isNutritionist || isPersonal;
    if (roles !== null && !isProfessional && mode === 'V2') {
      console.warn('[FitJourney] Non-professional user detected in V2, forcing V1');
      setMode('V1');
      return;
    }

    try {
      localStorage.setItem('fitjourney_mode', mode);
    } catch (e) {
      console.warn('[FitJourney] Could not save mode to localStorage');
    }
    // Mode persisted to localStorage
  }, [mode, isAdmin, loading]);

  const Switcher = () => {
    // Professionals can see the switcher, and it's ALWAYS visible if stuck in V2
    const isProfessional = isAdmin || isNutritionist || isPersonal;
    if (loading && mode === 'V1') return null;
    if (!isProfessional && mode === 'V1') return null;

    return (
      <SelectionRipple className="fixed bottom-6 right-6 z-[9999] rounded-full shadow-2xl">
        <motion.button
          drag
          dragMomentum={false}
          dragElastic={0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            setMode(mode === 'V1' ? 'V2' : 'V1');
          }}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-3 cursor-move select-none backdrop-blur-md shadow-xl ${
            mode === 'V1'
              ? 'bg-white/80 text-slate-900 border-slate-200 hover:bg-white shadow-slate-200/50'
              : 'bg-green-600/90 text-white border-green-500 hover:bg-green-600 shadow-green-500/40'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className={`w-2.5 h-2.5 rounded-full shadow-inner ${mode === 'V1' ? 'bg-slate-300' : 'bg-white animate-pulse shadow-[0_0_8px_white]'}`} />
          <span>{mode === 'V1' ? 'Acessar Dashboard de Prescrição' : 'Retornar ao Sistema Principal'}</span>
        </motion.button>
      </SelectionRipple>
    );
  };

  return (
    <div className="relative min-h-screen">
      <Switcher />

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
