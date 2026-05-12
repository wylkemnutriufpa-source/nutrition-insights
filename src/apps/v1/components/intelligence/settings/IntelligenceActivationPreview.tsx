/**
 * Intelligence Activation Preview — lets the professional replay
 * the cinematic first-experience inside the settings panel.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import FitIntelligenceActivation from "../activation/FitIntelligenceActivation";

export default function IntelligenceActivationPreview() {
  const [showActivation, setShowActivation] = useState(false);

  return (
    <>
      <Card className="border-amber-500/20 bg-gradient-to-br from-background to-amber-950/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Apresentação de Ativação
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize a experiência cinemática que seus pacientes premium veem ao ativar a Inteligência FitJourney pela primeira vez.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-gray-950 to-gray-900 p-8 cursor-pointer group"
            onClick={() => setShowActivation(true)}
          >
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex flex-col items-center gap-6 py-8">
              {/* Brain icon with pulse */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30"
              >
                <Sparkles className="w-10 h-10 text-amber-400" />
              </motion.div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-white">
                  Experiência de Ativação
                </h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Partículas douradas convergem em um cérebro neural pulsante, seguido de frases motivacionais e transição cinemática.
                </p>
                <p className="text-xs text-amber-500/60">Duração: ~8 segundos</p>
              </div>

              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2 shadow-lg shadow-amber-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActivation(true);
                }}
              >
                <Play className="w-5 h-5" />
                Reproduzir Apresentação
              </Button>
            </div>
          </motion.div>

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoCard emoji="✨" title="Partículas Douradas" desc="Convergem formando o cérebro neural" />
            <InfoCard emoji="🧠" title="Cérebro Pulsante" desc="Pontos e pulsos energéticos sem linhas" />
            <InfoCard emoji="🚀" title="Transição Cósmica" desc="Dissolve em poeira ao iniciar" />
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen activation overlay */}
      {showActivation && (
        <FitIntelligenceActivation
          userId="preview-mode"
          onComplete={() => setShowActivation(false)}
        />
      )}
    </>
  );
}

function InfoCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-center space-y-1">
      <span className="text-2xl">{emoji}</span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
