import { motion } from "framer-motion";

const stats = [
  { value: "+27", label: "funcionalidades" },
  { value: "600+", label: "alimentos banco TACO" },
  { value: "IA", label: "análise nutricional" },
  { value: "Gamificação", label: "engajamento paciente" },
];

export default function LandingSocialProof() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white mb-14"
        >
          Plataforma construída para{" "}
          <span className="text-shimmer">nutricionistas modernos</span>
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center group"
            >
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(210,92%,55%)] bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.value}
              </p>
              <p className="text-white/40 text-sm md:text-base">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
