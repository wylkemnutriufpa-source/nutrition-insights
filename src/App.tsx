import React, { useState, useEffect, Suspense } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { motion } from 'framer-motion';
import { useAuth } from './lib/auth';

const App = () => {
  const { isAdmin, loading } = useAuth();
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
    
    // Safety check: if user is not admin, they MUST stay in V1
    if (!isAdmin && mode === 'V2') {
      console.warn('[FitJourney] Non-admin user detected in V2, forcing V1');
      setMode('V1');
      return;
    }

    try {
      localStorage.setItem('fitjourney_mode', mode);
    } catch (e) {
      console.warn('[FitJourney] Could not save mode to localStorage');
    }
    console.log(`[FitJourney] Mode active: ${mode}`);
  }, [mode, isAdmin, loading]);

  const Switcher = () => {
    // Only admins can see and use the switcher
    if (!isAdmin || loading) return null;

    return (
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
        className={`fixed bottom-4 right-4 z-[9999] px-3 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all shadow-lg border flex items-center gap-2 cursor-move select-none ${
          mode === 'V1'
            ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
            : 'bg-green-600 text-white border-green-500 hover:bg-green-500 shadow-green-500/20'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className={`w-2 h-2 rounded-full ${mode === 'V1' ? 'bg-slate-400' : 'bg-white animate-pulse'}`} />
        <span>{mode === 'V1' ? 'Ver Dashboard de Prescrição' : 'Voltar para o Sistema Principal'}</span>
      </motion.button>
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