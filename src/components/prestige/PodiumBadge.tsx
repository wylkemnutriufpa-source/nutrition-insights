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

function HoloPulseRing({ delay, badgeColor, size }: { delay: number; badgeColor: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        inset: -size,
        border: `1.5px solid ${badgeColor}`,
        background: `conic-gradient(from 0deg, ${badgeColor}40, transparent 25%, ${badgeColor}20 50%, transparent 75%, ${badgeColor}40)`,
      }}
      animate={{
        scale: [0.6, 1.3],
        opacity: [0.8, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

export default function PodiumBadge({ plan, allPlans = [], position, onUpgrade }: PodiumBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!plan) return null;

  const medal = MEDAL_COLORS[position] || MEDAL_COLORS[2];
  const isGold = position === 0;
  const badgeColor = plan.color || medal.ring;

  const pulseRings = [
    { id: 0, delay: 0, size: 4 },
    { id: 1, delay: 0.7, size: 8 },
    { id: 2, delay: 1.4, size: 12 },
  ];

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

        {/* Holographic pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {pulseRings.map((r) => (
            <HoloPulseRing
              key={r.id}
              delay={r.delay}
              badgeColor={badgeColor}
              size={r.size}
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
