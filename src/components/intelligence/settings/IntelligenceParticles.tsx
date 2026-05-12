import { motion } from "framer-motion";
import { useMemo } from "react";

export default function IntelligenceParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, hsl(45 100% 60% / 0.6), hsl(35 100% 50% / 0.1))`,
            boxShadow: `0 0 ${p.size * 2}px hsl(45 100% 60% / 0.3)`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.7, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
