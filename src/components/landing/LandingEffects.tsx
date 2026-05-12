import { motion } from "framer-motion";
import { ReactNode } from "react";

/* ─── Floating micro-particles around mockups ─── */
export function MockupParticles({ color = "hsl(152,58%,45%)", count = 6 }: { color?: string; count?: number }) {
  const dots = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${10 + Math.random() * 80}%`,
    y: `${10 + Math.random() * 80}%`,
    size: 2 + Math.random() * 3,
    delay: i * 0.7,
    dur: 5 + Math.random() * 4,
  }));

  return (
    <>
      {dots.map(d => (
        <motion.div
          key={d.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: d.x, top: d.y, width: d.size, height: d.size,
            background: color,
            filter: "blur(0.5px)",
          }}
          animate={{
            y: [0, -16, 0],
            x: [0, 6, -6, 0],
            opacity: [0, 0.6, 0],
            scale: [0.8, 1.4, 0.8],
          }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/* ─── Energy glow layer behind a mockup ─── */
export function EnergyGlow({
  color1 = "hsl(152,58%,45%)",
  color2 = "hsl(210,92%,55%)",
  intensity = 0.12,
}: {
  color1?: string;
  color2?: string;
  intensity?: number;
}) {
  return (
    <motion.div
      className="absolute -inset-8 md:-inset-12 rounded-3xl pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${color1.replace(")", `,${intensity})`).replace("hsl", "hsla")}, ${color2.replace(")", `,${intensity * 0.6})`).replace("hsl", "hsla")}, transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.02, 0.97] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─── Glass-bordered premium mockup frame ─── */
export function PremiumMockupFrame({
  children,
  gradientFrom = "hsl(152,58%,45%,0.1)",
  gradientTo = "hsl(210,92%,55%,0.06)",
  className = "",
  floatDelay = 0,
}: {
  children: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
  floatDelay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 5, repeat: Infinity, delay: floatDelay, ease: "easeInOut" }}
      className={`relative cursor-pointer ${className}`}
    >
      {/* Glass border glow */}
      <div
        className="absolute -inset-px rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, hsla(152,58%,45%,0.2), transparent 40%, hsla(210,92%,55%,0.15))`,
          filter: "blur(1px)",
        }}
      />
      <div
        className="relative rounded-2xl p-2 md:p-3 border border-white/[0.08] backdrop-blur-sm overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          boxShadow: "0 8px 40px -12px hsla(152,58%,45%,0.15), 0 2px 16px -4px hsla(210,92%,55%,0.08)",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Subtle energy beam / light streak ─── */
export function EnergyBeam({
  angle = 135,
  color = "hsl(152,58%,45%)",
  className = "",
}: {
  angle?: number;
  color?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: "1px",
        height: "120px",
        background: `linear-gradient(${angle}deg, transparent, ${color.replace(")", ",0.2)")}, transparent)`,
        filter: "blur(2px)",
      }}
      animate={{ opacity: [0, 0.6, 0], scaleY: [0.5, 1, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
