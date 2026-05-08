import React, { useState, useEffect, Suspense } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    const saved = localStorage.getItem('fitjourney_mode');
    return (saved === 'V1' || saved === 'V2') ? saved : 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
    // Log do modo para debug
    console.log(`[FitJourney] Mode switched to: ${mode}`);
  }, [mode]);

  const Switcher = () => (
    <button
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-4 left-4 z-[9999] px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all shadow-xl border flex items-center gap-2 ${
        mode === 'V1'
          ? 'bg-blue-600 text-white border-blue-400 hover:bg-blue-700'
          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${mode === 'V1' ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
      <span>{mode === 'V1' ? 'Ir para V2.0' : 'Voltar para V1.0'}</span>
    </button>
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