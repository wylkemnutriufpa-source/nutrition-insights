/**
 * SuccessCelebration — Premium micro-interaction for task completion
 * Shows a brief confetti-like burst animation when triggered.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle2 } from "lucide-react";

interface CelebrationContextType {
  celebrate: (message?: string) => void;
}

const CelebrationContext = createContext<CelebrationContextType>({ celebrate: () => {} });

export function useCelebration() {
  return useContext(CelebrationContext);
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angle: (i / 8) * 360,
  delay: i * 0.03,
}));

function CelebrationOverlay({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onDone}
      className="fixed inset-0 z-[125] pointer-events-none flex items-center justify-center"
    >
      {/* Particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full bg-primary"
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5, 0],
            x: Math.cos((p.angle * Math.PI) / 180) * 80,
            y: Math.sin((p.angle * Math.PI) / 180) * 80,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
        />
      ))}

      {/* Central badge */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.2, 1], rotate: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        className="flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center"
        >
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </motion.div>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-bold text-primary bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-lg"
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  const celebrate = useCallback((msg = "Excelente! 🎉") => {
    setMessage(msg);
    setActive(true);
    setTimeout(() => setActive(false), 1200);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}
      <AnimatePresence>
        {active && <CelebrationOverlay message={message} onDone={() => {}} />}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
