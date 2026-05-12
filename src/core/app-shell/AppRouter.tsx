import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrescriptionDashboard } from '../../modules/FitJourney2/components/PrescriptionDashboard';
import { CompatibilityFallback } from './CompatibilityFallback';

export const AppRouter = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  if (mode === 'V1') {
    return <CompatibilityFallback onSwitch={() => setMode('V2')} />;
  }

  return (
    <div className="relative">
      <div className="fixed top-6 right-6 z-50">
        <button 
          onClick={() => setMode('V1')}
          className="px-4 py-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium transition-colors text-white"
        >
          Voltar para V1
        </button>
      </div>
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrescriptionDashboard />} />
          <Route path="/dashboard" element={<PrescriptionDashboard />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};
