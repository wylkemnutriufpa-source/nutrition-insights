import React, { useState, useEffect, Suspense } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { motion } from 'framer-motion';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    const saved = localStorage.getItem('fitjourney_mode');
    return (saved === 'V1' || saved === 'V2') ? saved : 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
    console.log(`[FitJourney] Mode switched to: ${mode}`);
  }, [mode]);

  const Switcher = () => (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-[18px] left-1/2 -translate-x-1/2 z-[9999] px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-colors shadow-sm border flex items-center gap-1.5 cursor-move select-none ${
        mode === 'V1'
          ? 'bg-blue-600/10 text-blue-500 border-blue-500/30 hover:bg-blue-600/20'
          : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className={`w-1 h-1 rounded-full ${mode === 'V1' ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`} />
      <span>{mode === 'V1' ? 'V2' : 'V1'}</span>
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