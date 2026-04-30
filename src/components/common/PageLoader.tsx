export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#0d0d1a] text-white">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Iniciando FitJourney...</p>
    </div>
  );
}

export default PageLoader;