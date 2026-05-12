import { motion, useReducedMotion } from "framer-motion";

interface SystemAwarenessMomentProps {
  active: boolean;
  message: string;
  durationMultiplier?: number;
}

export default function SystemAwarenessMoment({ active, message, durationMultiplier = 1 }: SystemAwarenessMomentProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
      {/* Radial ripple */}
      {!reduced && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400, height: 400,
            background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.3, 2.5] }}
          transition={{ duration: 1.4 * durationMultiplier, ease: "easeOut" }}
        />
      )}

      {/* Message */}
      <motion.p
        className="text-sm md:text-base font-medium tracking-[0.08em] text-center max-w-xs"
        style={{
          background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
        initial={{ opacity: 0, y: 8, letterSpacing: "0.04em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "0.08em" }}
        transition={{ duration: 0.7 * durationMultiplier, ease: [0.22, 1, 0.36, 1] }}
      >
        {message}
      </motion.p>
    </div>
  );
}
