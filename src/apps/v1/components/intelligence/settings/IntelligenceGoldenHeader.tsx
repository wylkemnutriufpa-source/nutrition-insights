import { motion } from "framer-motion";
import { Brain, Sparkles, Crown } from "lucide-react";
import { Badge } from "@v1/components/ui/badge";

export default function IntelligenceGoldenHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 p-6 md:p-8"
      style={{
        background: "linear-gradient(135deg, hsl(35 40% 8%) 0%, hsl(40 30% 12%) 40%, hsl(45 25% 10%) 100%)",
      }}
    >
      {/* Gold glow effects */}
      <div className="absolute top-0 right-0 w-60 h-60 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.15), transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(35 100% 50% / 0.1), transparent 70%)" }} />

      {/* Animated border shimmer */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(45 100% 60% / 0.3), transparent)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        {/* Neural Orb Icon */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(45 100% 45%), hsl(35 100% 35%))",
              boxShadow: "0 0 30px hsl(45 100% 50% / 0.4), inset 0 1px 0 hsl(45 100% 80% / 0.3)",
            }}
          >
            <Brain className="w-8 h-8 md:w-10 md:h-10 text-amber-950" />
          </motion.div>
          <motion.div
            className="absolute -inset-2 rounded-2xl"
            style={{ border: "1px solid hsl(45 100% 60% / 0.3)" }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-xl md:text-2xl font-bold"
              style={{
                background: "linear-gradient(180deg, #FFD700 0%, #FFFACD 40%, #FFD700 70%, #B8860B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 8px rgba(255,215,0,0.3))",
              }}
            >
              Inteligência FitJourney
            </h1>
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </div>
          <p className="text-sm text-amber-200/60 mt-1 max-w-xl">
            Configure mensagens, lembretes, perguntas e o tom da inteligência comportamental dos seus pacientes. Tenha controle total sobre como a IA interage com cada pessoa.
          </p>
        </div>

        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="hidden md:block"
        >
          <Sparkles className="w-8 h-8 text-amber-500/40" />
        </motion.div>
      </div>
    </motion.div>
  );
}
