
import React from "react";

/**
 * Loader Independente
 * Componente isolado e autossuficiente para exibição do boot do sistema.
 * Não depende de contextos (Providers) externos para evitar loops ou quebras.
 */
const IndependentLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden">
      {/* Video Container - Mantendo centralização absoluta */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          className="w-full h-full max-w-[800px] max-h-[800px] object-contain"
          src="/videos/logo-animated.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        
        {/* Overlay suave para profundidade */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>

      {/* Indicador de carregamento discreto no rodapé */}
      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="w-32 h-[1px] bg-white/10 overflow-hidden rounded-full">
          <div className="h-full bg-emerald-500/50 animate-[loading_2s_ease-in-out_infinite]" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-light">
          Sincronizando Sistemas
        </span>
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
