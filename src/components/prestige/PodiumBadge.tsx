import { useState } from "react";
import { motion } from "framer-motion";
import type { PrestigePlan } from "@/hooks/usePrestige";
import PlanDetailModal from "./PlanDetailModal";

interface PodiumBadgeProps {
  plan: PrestigePlan | null;
  allPlans?: PrestigePlan[];
  position: number; // 0=gold, 1=silver, 2=bronze
  onUpgrade?: (planId: string) => void;
}

const MEDAL_COLORS = [
  { ring: "#FFD700", glow: "rgba(255,215,0,0.5)", particle: "#FFC107" },
  { ring: "#C0C0C0", glow: "rgba(192,192,192,0.45)", particle: "#B0BEC5" },
  { ring: "#CD7F32", glow: "rgba(205,127,50,0.45)", particle: "#D4905C" },
];

function OrbitalParticle({ duration, delay, tilt, radius, particleSize, color }: {
  duration: number; delay: number; tilt: number; radius: number; particleSize: number; color: string;
}) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ transform: `rotateX(${tilt}deg)`, transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="absolute"
        style={{
          width: particleSize,
          height: particleSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}, transparent)`,
          boxShadow: `0 0 ${particleSize * 2}px ${color}`,
          top: "50%",
          left: "50%",
          marginTop: -particleSize / 2,
          marginLeft: -particleSize / 2,
          offsetPath: `circle(${radius}px at 0px 0px)`,
          offsetRotate: "0deg",
        }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
      />
    </motion.div>
  );
}

function getOrbits(badgeColor: string, medalParticle: string) {
  return [
    { duration: 3, delay: 0, tilt: 65, particleSize: 2.5, color: badgeColor },
    { duration: 3, delay: 1.5, tilt: 65, particleSize: 2, color: medalParticle },
    { duration: 4, delay: 0.3, tilt: -20, particleSize: 3, color: badgeColor },
    { duration: 3.5, delay: 0.8, tilt: 140, particleSize: 2, color: medalParticle },
  ];
}

export default function PodiumBadge({ plan, allPlans = [], position, onUpgrade }: PodiumBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!plan) return null;

  const medal = MEDAL_COLORS[position] || MEDAL_COLORS[2];
  const isGold = position === 0;
  const badgeColor = plan.color || medal.ring;

  return (
    <>
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
        className="relative cursor-pointer group"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${badgeColor}30 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: isGold ? 2 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning border ring */}
        <motion.div
          className="absolute -inset-1 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${badgeColor}, transparent 40%, ${badgeColor}80 60%, transparent 80%, ${badgeColor})`,
            opacity: 0.6,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: isGold ? 14 : 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Main badge body */}
        <div
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm border z-10"
          style={{
            backgroundColor: badgeColor + "18",
            borderColor: badgeColor + "50",
            boxShadow: `0 0 ${isGold ? 20 : 12}px ${badgeColor}35, inset 0 1px 0 ${badgeColor}20`,
          }}
        >
          {/* Icon with 3D Y-axis rotation like the logo leaf */}
          <motion.span
            className="text-base leading-none inline-block"
            style={{ perspective: 200 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            {plan.badge_icon}
          </motion.span>

          {/* Label with gradient text for gold */}
          <span
            className="text-[11px] font-bold tracking-wide uppercase"
            style={isGold ? {
              backgroundImage: `linear-gradient(135deg, ${badgeColor}, #fbbf24, ${badgeColor})`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer-text 2s ease-in-out infinite",
            } : {
              color: badgeColor,
            }}
          >
            {plan.badge_label || plan.name}
          </span>
        </div>

        {/* Orbital particles — same effect as logo */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center" style={{ perspective: 400 }}>
          {getOrbits(badgeColor, medal.particle).map((o, i) => (
            <OrbitalParticle
              key={i}
              duration={o.duration}
              delay={o.delay}
              tilt={o.tilt}
              radius={20}
              particleSize={o.particleSize}
              color={o.color}
            />
          ))}
        </div>

        {/* Hover shine sweep */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${badgeColor}25 50%, transparent 60%)`,
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
          />
        </motion.div>
      </motion.button>

      <PlanDetailModal
        plan={plan}
        allPlans={allPlans}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpgrade={onUpgrade}
      />

      <style>{`
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}
