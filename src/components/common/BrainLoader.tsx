import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import logoVideo from "@/assets/logo-video.mp4";

const DEFAULT_MESSAGES = [
  "Analisando seu metabolismo…",
  "Processando sinais clínicos…",
  "Construindo sua estratégia nutricional…",
  "Calculando aderência comportamental…",
  "Ajustando seu plano terapêutico…",
];

interface BrainLoaderProps {
  text?: string;
  messages?: string[];
  rotateMessages?: boolean;
  className?: string;
}

// ─── Shared brain animation ───
function AnimatedBrain({ size, glowSize }: { size: number; glowSize: number }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Aura glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)`,
          width: glowSize,
          height: glowSize,
          top: -(glowSize - size) / 2,
          left: -(glowSize - size) / 2,
        }}
        animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={shouldReduceMotion ? {} : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbiting particles */}
      {[0, 120, 240].map((deg) => (
        <motion.div
          key={deg}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: Math.max(3, size * 0.06),
            height: Math.max(3, size * 0.06),
            top: "50%",
            left: "50%",
          }}
          animate={{
            rotate: [deg, deg + 360],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          // orbit radius via transform origin
          // We use x/y to simulate orbit
        >
          <motion.div
            className="rounded-full bg-primary/50"
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            animate={{
              x: [0, Math.cos((deg * Math.PI) / 180) * size * 0.55, 0],
              y: [0, Math.sin((deg * Math.PI) / 180) * size * 0.55, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: deg / 360 }}
          />
        </motion.div>
      ))}

      {/* Brain icon with Y-axis rotation */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={shouldReduceMotion ? {} : { rotateY: [0, 360] }}
        transition={shouldReduceMotion ? {} : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ perspective: 600 }}
      >
        <Brain
          className="text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
          style={{ width: size * 0.55, height: size * 0.55 }}
        />
      </motion.div>
    </div>
  );
}

function MessageRotator({ messages, text }: { messages: string[]; text?: string }) {
  const [idx, setIdx] = useState(0);
  const displayMessages = text ? [text] : messages;

  useEffect(() => {
    if (displayMessages.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % displayMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [displayMessages.length]);

  return (
    <div className="h-5 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-muted-foreground font-medium text-center"
        >
          {displayMessages[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ━━━ INLINE: small, for buttons ━━━
export function BrainLoaderInline({ text, className = "" }: { text?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <motion.span
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ perspective: 400, display: "inline-flex" }}
      >
        <Brain className="w-4 h-4 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)]" />
      </motion.span>
      {text && <span className="text-xs text-muted-foreground">{text}</span>}
    </span>
  );
}

// ━━━ CARD: medium, for cards/modals ━━━
export function BrainLoaderCard({ text, messages = DEFAULT_MESSAGES, className = "" }: BrainLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 gap-4 ${className}`}>
      <AnimatedBrain size={56} glowSize={90} />
      <MessageRotator messages={messages} text={text} />
    </div>
  );
}

// ━━━ SCREEN: full overlay ━━━
export function BrainLoaderScreen({
  text,
  messages = DEFAULT_MESSAGES,
  visible = true,
  onComplete,
}: BrainLoaderProps & { visible?: boolean; onComplete?: () => void }) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6"
          >
            <AnimatedBrain size={80} glowSize={140} />
            <MessageRotator messages={messages} text={text} />
            {/* Life bar */}
            <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Default export = Card variant
export default BrainLoaderCard;
