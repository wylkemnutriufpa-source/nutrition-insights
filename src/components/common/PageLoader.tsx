export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black overflow-hidden">
      {/* Video — Perfectly centered and covering */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          className="min-w-full min-h-full w-auto h-auto object-cover"
          src="/videos/logo-animated.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ filter: "brightness(0.8) contrast(1.1)" }}
        />
      </div>
      
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">
          Sincronizando Inteligência...
        </p>
      </div>
    </div>
  );
}

export default PageLoader;