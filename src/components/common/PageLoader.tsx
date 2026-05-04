import logoVideo from "@/assets/logo-video.mp4";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#0d0d1a] text-white">
      <div className="relative mb-8">
        <video
          src={logoVideo}
          autoPlay
          muted
          loop
          playsInline
          className="w-32 h-32 md:w-40 md:h-40 object-contain mix-blend-screen"
          style={{
            filter: "drop-shadow(0 0 15px hsl(152 58% 48% / 0.3))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-transparent opacity-40 pointer-events-none" />
      </div>
      <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-emerald-500/80 animate-pulse">
        Estabilizando Ecossistema...
      </p>
    </div>
  );
}

export default PageLoader;