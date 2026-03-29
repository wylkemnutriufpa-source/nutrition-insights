import { motion } from "framer-motion";
import { Dumbbell, BarChart3, Camera, BellRing } from "lucide-react";

const features = [
  { icon: Dumbbell, title: "Check-ins avançados", desc: "Peso, medidas, marcadores subjetivos e fotos em cada ponto de controle." },
  { icon: BarChart3, title: "Score de preparação", desc: "Motor inteligente calcula prontidão do atleta para treino e competição." },
  { icon: Camera, title: "Comparação de fotos", desc: "Galeria visual lado a lado para avaliação de evolução corporal." },
  { icon: BellRing, title: "Alertas inteligentes", desc: "Detecção automática de platô, catabolismo e risco de overtraining." },
];

export default function LandingCoachSection() {
  return (
    <section className="py-28 md:py-36 px-6 bg-[hsl(240,15%,6%)] relative overflow-hidden">
      {/* Subtle warm glow for coach section */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsla(36,95%,55%,0.04), transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preparação física{" "}
            <span className="text-shimmer">profissional</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto">
            Ferramentas avançadas para coaches acompanharem atletas em evolução constante.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group"
            >
              <div
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500 h-full relative overflow-hidden"
                style={{
                  boxShadow: "0 4px 24px -8px hsla(36,95%,55%,0.06)",
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at 50% 0%, hsla(36,95%,55%,0.06), transparent 70%)",
                  }}
                />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <f.icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-white/30 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
