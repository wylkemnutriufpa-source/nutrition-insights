
import React from "react";

/**
 * Loader Independente
 * Componente isolado e autossuficiente para exibição do boot do sistema.
 * Não depende de contextos (Providers) externos para evitar loops ou quebras.
 */
const IndependentLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white overflow-hidden">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 animate-pulse">Carregando...</h1>
        <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default IndependentLoader;
