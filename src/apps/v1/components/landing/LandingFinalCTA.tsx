import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingFinalCTA() {
  return (
    <section className="py-28 md:py-36 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Comece hoje a transformar sua{" "}
          <span className="text-shimmer">clínica de nutrição</span>
        </h2>
        <p className="text-white/40 text-base md:text-lg mb-10">
          Configure sua conta em menos de 2 minutos. Sem cartão de crédito.
        </p>

        <Link to="/auth">
          <Button
            size="lg"
            className="h-14 px-12 text-sm font-bold rounded-xl bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white shadow-lg shadow-[hsl(152_58%_45%/0.2)] transition-all duration-300 hover:scale-[1.04] glow-pulse-border"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Criar conta gratuita
          </Button>
        </Link>
      </motion.div>

      <p className="text-white/10 text-xs text-center mt-16 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3" /> Powered by FitJourney
      </p>
    </section>
  );
}
