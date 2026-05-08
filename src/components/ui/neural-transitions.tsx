import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

const EASE_PREMIUM = [0.22, 1, 0.36, 1];

/**
 * Neural step transition — for anamnesis / onboarding steps.
 * Content scales down slightly, fades, then new content emerges with blur→focus.
 */
export function NeuralStepTransition({
  stepKey,
  children,
  direction = 1,
}: {
  stepKey: string | number;
  children: ReactNode;
  direction?: 1 | -1;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={
          reduced
            ? { opacity: 0 }
            : {
                opacity: 0,
                y: 12 * direction,
                scale: 0.96,
                filter: "blur(6px)",
              }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : {
                opacity: 0,
                y: -12 * direction,
                scale: 0.96,
                filter: "blur(4px)",
              }
        }
        transition={{
          duration: 0.48,
          ease: EASE_PREMIUM as unknown as number[],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Screen entrance — staggered reveal for dashboard/important screens.
 * Wraps children; each direct child gets staggered entrance.
 */
export function ScreenEntrance({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger item — individual item inside a ScreenEntrance
 */
export function StaggerItem({
  children,
  index = 0,
  isHero = false,
  className,
}: {
  children: ReactNode;
  index?: number;
  isHero?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const delay = index * 0.08;

  return (
    <motion.div
      className={className}
      initial={
        reduced
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: 16,
              scale: isHero ? 0.97 : 1,
            }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: EASE_PREMIUM as unknown as number[],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Modal materialization — premium modal entrance with blur + scale.
 */
export function ModalMaterialize({
  isOpen,
  children,
  onClose,
}: {
  isOpen: boolean;
  children: ReactNode;
  onClose?: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with progressive blur */}
          <motion.div
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          {/* Modal content */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, filter: "blur(8px)" }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, filter: "blur(0px)" }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, filter: "blur(4px)" }
            }
            transition={{
              duration: 0.4,
              ease: EASE_PREMIUM as unknown as number[],
            }}
          >
            <div className="pointer-events-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Tab slide transition — for dashboard tab switches with sliding highlight.
 */
export function TabSlideTransition({
  tabKey,
  children,
  direction = 1,
}: {
  tabKey: string;
  children: ReactNode;
  direction?: 1 | -1;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={tabKey}
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, x: 20 * direction, filter: "blur(4px)" }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: 1, x: 0, filter: "blur(0px)" }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, x: -20 * direction, filter: "blur(2px)" }
        }
        transition={{ duration: 0.32, ease: EASE_PREMIUM as unknown as number[] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Energy wave — horizontal green energy wave between steps
 */
export function EnergyWave({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <motion.div
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px pointer-events-none z-30"
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: [0, 0.6, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        background:
          "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2), transparent)",
        transformOrigin: "left center",
      }}
    />
  );
}
