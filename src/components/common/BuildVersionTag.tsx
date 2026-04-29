import React from "react";
import { BUILD_INFO } from "@/lib/buildInfo";

import { RefreshCw } from "lucide-react";
import { forceUpdate } from "@/lib/versionCheck";

export const BuildVersionTag = () => {
  // Apenas visível em modo debug ou para admins
  const isDebug = localStorage.getItem("fj-debug") === "true";
  const [isUpdating, setIsUpdating] = React.useState(false);
  
  if (!isDebug && BUILD_INFO.mode === "production" && !window.location.search.includes("debug=1")) return null;

  const handleManualUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    forceUpdate();
  };

  return (
    <div className="fixed bottom-2 right-2 z-[9999]">
      <div 
        className="bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-mono border border-white/20 flex flex-col items-end opacity-50 hover:opacity-100 transition-opacity cursor-help" 
        title="Build Info"
      >
        <span>v{BUILD_INFO.version}</span>
        <span>{BUILD_INFO.shortHash} | {new Date(BUILD_INFO.timestamp).toLocaleTimeString()}</span>
        <button
          onClick={handleManualUpdate}
          disabled={isUpdating}
          className="mt-1 flex items-center gap-1 text-[9px] bg-primary/20 hover:bg-primary/40 text-primary-foreground px-1.5 py-0.5 rounded transition-colors"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Atualizando...' : 'Atualizar Sistema'}
        </button>
      </div>
    </div>
  );
};
