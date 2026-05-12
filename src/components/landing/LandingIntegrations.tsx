import { motion } from "framer-motion";
import { Database, FileText, BarChart3, TrendingUp, Smartphone, Shield, Zap } from "lucide-react";

const integrations = [
  { icon: Database, label: "Banco TACO", desc: "Tabela nutricional brasileira integrada" },
  { icon: FileText, label: "Exportação PDF", desc: "Planos e relatórios em PDF profissional" },
  { icon: BarChart3, label: "Dashboard Clínico", desc: "Analytics de desempenho em tempo real" },
  { icon: TrendingUp, label: "Evolução do Paciente", desc: "Acompanhamento de métricas e progresso" },
  { icon: Smartphone, label: "App Mobile (PWA)", desc: "Acesso pelo celular como app nativo" },
  { icon: Shield, label: "LGPD Compliance", desc: "Dados protegidos e criptografados" },
  { icon: Zap, label: "Automações", desc: "Lembretes e check-ins automáticos" },
];

export default function LandingIntegrations() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white mb-4"
        >
          Tudo <span className="text-shimmer">integrado</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-white/35 text-center text-base md:text-lg mb-14 max-w-xl mx-auto"
        >
          Uma plataforma completa. Sem precisar de ferramentas externas.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {integrations.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 group"
            >
              <item.icon className="w-5 h-5 text-[hsl(152,58%,45%)] mb-3 group-hover:scale-110 transition-transform duration-300" />
              <p className="text-white/80 text-sm font-medium mb-1">{item.label}</p>
              <p className="text-white/30 text-xs leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
