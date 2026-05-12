import React from 'react';

interface CompatibilityFallbackProps {
  onSwitch: () => void;
}

/**
 * CompatibilityFallback - Render passivo isolado.
 * NÃO importa módulos V1, providers ou toca em auth/router.
 */
export const CompatibilityFallback = ({ onSwitch }: CompatibilityFallbackProps) => (
  <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center relative">
    <div className="absolute top-4 right-4">
      <button 
        onClick={onSwitch}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
      >
        Mudar para BETA (V2)
      </button>
    </div>
    <h1 className="text-4xl font-bold mb-4">FitJourney 1.0 (PRODUÇÃO)</h1>
    <p className="text-xl text-slate-400 max-w-2xl">
      Você está no modo de compatibilidade. Como as pastas legadas foram removidas na branch V2, 
      esta tela serve como placeholder para o sistema antigo.
    </p>
  </div>
);
