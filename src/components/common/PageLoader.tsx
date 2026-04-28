import { motion } from "framer-motion";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-hidden bg-black text-white">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/loading.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{ filter: "brightness(0.5) contrast(1.1) saturate(1.2)" }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Subtle primary glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Loading indicator */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Pulsing ring */}
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-primary/40"
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Progress bar */}
        <div className="w-24 h-[2px] rounded-full overflow-hidden bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--accent) / 0.8))",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
