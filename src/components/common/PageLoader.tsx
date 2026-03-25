import { motion } from "framer-motion";
import ShaderBackground from "@/components/ui/shader-background";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black">
      <ShaderBackground />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          className="relative"
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-purple-500/40 flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, hsl(270 80% 60% / 0.2), transparent 70%)",
              boxShadow: "0 0 40px hsl(270 80% 60% / 0.3), 0 0 80px hsl(270 80% 60% / 0.1)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <motion.span
              className="text-2xl select-none"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 8px hsl(270 80% 60% / 0.6))" }}
            >
              🧠
            </motion.span>
          </motion.div>

          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid hsl(270 80% 60% / 0.3)" }}
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid hsl(270 80% 60% / 0.2)" }}
            animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
            transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.div>

        <motion.p
          className="text-sm font-medium tracking-widest uppercase"
          style={{
            background: "linear-gradient(90deg, hsl(270 80% 70%), hsl(45 100% 60%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          Carregando
        </motion.p>
      </div>
    </div>
  );
}

export default PageLoader;
