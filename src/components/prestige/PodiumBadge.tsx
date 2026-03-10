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

function FloatingParticle({ delay, color, size, x, y }: { delay: number; color: string; size: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, backgroundColor: color, left: `${50 + x}%`, top: `${50 + y}%`, opacity: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        y: [0, -18 - Math.random() * 12],
        x: [0, (Math.random() - 0.5) * 16],
        scale: [0.5, 1.2, 0.3],
      }}
      transition={{ duration: 2.5 + Math.random(), repeat: Infinity, delay, ease: "easeOut" }}
    />
  );
}

export default function PodiumBadge({ plan, allPlans = [], position, onUpgrade }: PodiumBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!plan) return null;

  const medal = MEDAL_COLORS[position] || MEDAL_COLORS[2];
  const isGold = position === 0;
  const badgeColor = plan.color || medal.ring;

  const particles = Array.from({ length: isGold ? 8 : 5 }, (_, i) => ({
    id: i,
    delay: i * 0.4,
    size: 2 + Math.random() * 3,
    x: (Math.random() - 0.5) * 60,
    y: (Math.random() - 0.5) * 60,
  }));

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
          transition={{ duration: isGold ? 8 : 12, repeat: Infinity, ease: "linear" }}
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
          {/* Icon with shimmer */}
          <motion.span
            className="text-base leading-none"
            animate={isGold ? {
              textShadow: [
                `0 0 4px ${badgeColor}`,
                `0 0 12px ${badgeColor}`,
                `0 0 4px ${badgeColor}`,
              ],
            } : undefined}
            transition={{ duration: 1.5, repeat: Infinity }}
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

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          {particles.map((p) => (
            <FloatingParticle
              key={p.id}
              delay={p.delay}
              color={medal.particle}
              size={p.size}
              x={p.x}
              y={p.y}
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
