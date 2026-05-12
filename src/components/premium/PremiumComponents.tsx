import { motion, useReducedMotion } from "framer-motion";
import { Crown } from "lucide-react";
import { usePremiumPresence } from "@/hooks/usePremiumPresence";

/** Subtle premium badge — displays inline next to user name or header */
export function PremiumBadge({ className = "" }: { className?: string }) {
  const { isPremium, badgeLabel, isElite } = usePremiumPresence();
  const reduced = useReducedMotion();

  if (!isPremium || !badgeLabel) return null;

  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${className}`}
      style={{
        background: "hsl(var(--premium-gold) / 0.12)",
        color: "hsl(var(--premium-gold))",
        border: "1px solid hsl(var(--premium-gold) / 0.2)",
      }}
      initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
      animate={reduced ? {} : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Crown style={{ width: 10, height: 10 }} />
      {badgeLabel}
    </motion.span>
  );
}

/** Premium message banner — shows contextual premium microcopy */
export function PremiumMessage({ className = "" }: { className?: string }) {
  const { isPremium, message } = usePremiumPresence();
  const reduced = useReducedMotion();

  if (!isPremium || !message) return null;

  return (
    <motion.p
      className={`text-xs tracking-wide ${className}`}
      style={{ color: "hsl(var(--premium-gold) / 0.7)" }}
      initial={reduced ? {} : { opacity: 0, y: 4 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {message}
    </motion.p>
  );
}

/** Premium card wrapper — adds subtle gold edge and optional shimmer */
export function PremiumCardWrapper({
  children,
  className = "",
  enableShimmer = false,
}: {
  children: React.ReactNode;
  className?: string;
  enableShimmer?: boolean;
}) {
  const { isPremium, cardClass, shimmerClass } = usePremiumPresence();

  if (!isPremium) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`${className} ${cardClass} ${enableShimmer ? shimmerClass : ""} relative overflow-hidden`}>
      {children}
    </div>
  );
}

/** Premium avatar ring — wraps avatar with golden ring */
export function PremiumAvatarRing({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPremium, ringClass } = usePremiumPresence();

  return (
    <div className={`${className} ${isPremium ? `rounded-full ${ringClass}` : ""}`}>
      {children}
    </div>
  );
}

/** Premium accent line — golden underline for titles */
export function PremiumAccentLine() {
  const { isPremium } = usePremiumPresence();
  if (!isPremium) return null;

  return (
    <div
      className="h-[2px] w-10 rounded-full mt-1"
      style={{ background: "var(--premium-gradient)" }}
    />
  );
}
