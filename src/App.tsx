import React, { useState, useEffect, Suspense } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { motion } from 'framer-motion';

const App = () => {
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
    try {
      localStorage.setItem('fitjourney_mode', mode);
    } catch (e) {
      console.warn('[FitJourney] Could not save mode to localStorage');
    }
    console.log(`[FitJourney] Mode active: ${mode}`);
  }, [mode]);

  const Switcher = () => (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-[18px] left-1/2 -translate-x-1/2 z-[9999] px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shadow-xl border flex items-center gap-2 cursor-move select-none ${
        mode === 'V1'
          ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
          : 'bg-green-600 text-white border-green-500 hover:bg-green-500 shadow-green-500/20'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${mode === 'V1' ? 'bg-slate-400' : 'bg-white animate-pulse'}`} />
      <span>{mode === 'V1' ? 'Mudar para V2' : 'Voltar para V1'}</span>
    </motion.button>
  );

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