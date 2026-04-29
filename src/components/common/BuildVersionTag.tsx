import React from "react";
import { BUILD_INFO } from "@/lib/buildInfo";

export const BuildVersionTag = () => {
  // Apenas visível em modo debug ou para admins
  const isDebug = localStorage.getItem("fj-debug") === "true";
  
  if (!isDebug && BUILD_INFO.mode === "production" && !window.location.search.includes("debug=1")) return null;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-mono border border-white/20 flex flex-col items-end opacity-50 hover:opacity-100 transition-opacity pointer-events-auto cursor-help" title="Build Info">
        <span>v{BUILD_INFO.version}</span>
        <span>{BUILD_INFO.shortHash} | {new Date(BUILD_INFO.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
