import React, { useState, useEffect } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';
import Index from './pages/Index';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    const saved = localStorage.getItem('fitjourney_mode');
    return (saved === 'V1' || saved === 'V2') ? saved : 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  // Global Switcher UI
  const Switcher = () => (
    <button 
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-4 right-4 z-[9999] px-6 py-2.5 rounded-full text-xs font-bold uppercase transition-all shadow-2xl border flex items-center gap-3 ${
        mode === 'V2' 
          ? 'bg-green-600 text-white border-green-400 hover:bg-green-700' 
          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${mode === 'V2' ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
      <span>
        {mode === 'V2' ? 'FitJourney 2.0 (Beta)' : 'FitJourney 1.0'}
      </span>
      <span className="opacity-50 text-[10px] border-l border-white/20 pl-3">
        Clique para Alternar
      </span>
    </button>
  );

  if (mode === 'V1') {
    return (
      <div className="relative min-h-screen">
        <Switcher />
        <Index />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <Switcher />
      <PrescriptionDashboard />
    </div>
  );
};

export default App;
