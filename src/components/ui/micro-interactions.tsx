import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EASE_PREMIUM = [0.22, 1, 0.36, 1];

/**
 * Selection ripple — energy ripple effect on selection actions.
 * Wrap any clickable element.
 */
export function SelectionRipple({
  children,
  className,
  color = "primary",
}: {
  children: ReactNode;
  className?: string;
  color?: "primary" | "accent";
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);
  const reduced = useReducedMotion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = nextId.current++;
      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    },
    [reduced]
  );

  const colorVar = color === "accent" ? "var(--accent)" : "var(--primary)";

  return (
    <div className={cn("relative overflow-hidden", className)} onClick={handleClick}>
      {children}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            background: `radial-gradient(circle, hsl(${colorVar} / 0.25) 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ width: 0, height: 0, opacity: 0.6 }}
          animate={{ width: 120, height: 120, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/**
 * CognitiveHover — premium hover effect for cards (desktop).
 * Subtle elevation + glow on hover.
 */
export function CognitiveHover({
  children,
  className,
  glowColor = "primary",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: "primary" | "accent";
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn("transition-shadow duration-200", className)}
      whileHover={
        reduced
          ? undefined
          : {
              y: -4,
              transition: { duration: 0.14, ease: EASE_PREMIUM as any },
            }
      }
      style={{
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ProgressPulse — micro pulse animation when progress changes.
 */
export function ProgressPulse({
  children,
  trigger,
  className,
}: {
  children: ReactNode;
  trigger: number | string;
  className?: string;
}) {
  return (
    <motion.div
      key={trigger}
      className={className}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 0.3, ease: EASE_PREMIUM as any }}
    >
      {children}
    </motion.div>
  );
}

/**
 * IntelligentButton — premium CTA button with internal glow animation.
 * Has a slow shimmer pulse every 6s.
 */
export function IntelligentButton({
  children,
  onClick,
  disabled,
  className,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "confirm";
}) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden rounded-xl font-semibold transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          : "bg-gradient-to-r from-primary to-accent text-primary-foreground",
        className
      )}
      whileHover={reduced ? undefined : { scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {/* Internal shimmer */}
      {!reduced && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 25%, hsl(var(--primary-foreground) / 0.08) 37%, hsl(var(--primary-foreground) / 0.12) 50%, hsl(var(--primary-foreground) / 0.08) 63%, transparent 75%)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["-200% center", "200% center"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 4,
            ease: "easeInOut",
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

/**
 * DecisionConfirm — visual feedback when a decision is registered.
 * Shows a quick energy ripple + golden glow on confirm.
 */
export function DecisionConfirm({
  children,
  confirmed,
  className,
}: {
  children: ReactNode;
  confirmed: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={
        confirmed
          ? {
              boxShadow: [
                "0 0 0 0 hsl(var(--accent) / 0)",
                "0 0 16px 4px hsl(var(--accent) / 0.2)",
                "0 0 0 0 hsl(var(--accent) / 0)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.6, ease: EASE_PREMIUM as any }}
    >
      {children}
    </motion.div>
  );
}

/**
 * EmpathicError — soft amber highlight with breathing animation (non-punitive).
 */
export function EmpathicError({
  children,
  active,
  className,
}: {
  children: ReactNode;
  active: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border transition-colors",
        active
          ? "border-warning/40 bg-warning/5"
          : "border-transparent",
        className
      )}
      animate={
        active
          ? { opacity: [0.85, 1, 0.85] }
          : { opacity: 1 }
      }
      transition={
        active
          ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
    >
      {children}
    </motion.div>
  );
}