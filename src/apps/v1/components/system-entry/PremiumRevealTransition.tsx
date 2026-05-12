import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface PremiumRevealTransitionProps {
  active: boolean;
  children: ReactNode;
}

export default function PremiumRevealTransition({ active, children }: PremiumRevealTransitionProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <motion.div
      className="w-full h-full"
      initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)" }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Wrapper for dashboard cards to stagger entrance */
export function RevealCard({
  children,
  index = 0,
  isHero = false,
}: {
  children: ReactNode;
  index?: number;
  isHero?: boolean;
}) {
  const reduced = useReducedMotion();
  const delay = index * 0.06;

  return (
    <motion.div
      initial={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, y: 12, scale: isHero ? 0.97 : 1 }
      }
      animate={
        reduced
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
