import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";

// ─── Types ───
type BootStage = "idle" | "awakening" | "syncing" | "ready" | "transitioning";

interface AppBootExperienceProps {
  /** True when ALL data (auth, profile, roles, flags) is loaded */
  dataReady: boolean;
  /** Called after exit animation completes — mount the real app */
  onComplete: () => void;
}

// ─── Haptic helper ───
function microVibrate(ms = 12) {
  try {
    navigator?.vibrate?.(ms);
  } catch { /* noop */ }
}

// ─── Sound helper ───
function playBootTone() {
  try {
    if (localStorage.getItem("fj_audio_muted") === "1") return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(396, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(528, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.4);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch { /* Web Audio not available */ }
}

// ─── Neural network nodes (deterministic) ───
const NEURAL_NODES = [
  { x: 50, y: 20, r: 2.5 }, { x: 30, y: 35, r: 2 }, { x: 70, y: 35, r: 2 },
  { x: 20, y: 50, r: 1.8 }, { x: 50, y: 50, r: 3 }, { x: 80, y: 50, r: 1.8 },
  { x: 30, y: 65, r: 2 }, { x: 70, y: 65, r: 2 }, { x: 50, y: 80, r: 2.5 },
  { x: 40, y: 42, r: 1.5 }, { x: 60, y: 42, r: 1.5 },
  { x: 40, y: 58, r: 1.5 }, { x: 60, y: 58, r: 1.5 },
];

const NEURAL_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5],
  [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8],
  [0, 9], [0, 10], [9, 4], [10, 4], [4, 11], [4, 12], [11, 8], [12, 8],
  [1, 9], [2, 10], [6, 11], [7, 12], [3, 4], [5, 4],
];

// ─── Orbiting particles ───
function OrbitingParticles({ visible }: { visible: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        radius: 90 + (i % 3) * 20,
        size: 2 + (i % 3),
        duration: 6 + i * 0.8,
        delay: i * 0.3,
      })),
    []
  );

  if (!visible) return null;

  return (
    <g>
      {particles.map((p, i) => (
        <motion.circle
          key={i}
          cx={50 + Math.cos(p.angle) * (p.radius / 2)}
          cy={50 + Math.sin(p.angle) * (p.radius / 2)}
          r={p.size / 2}
          fill="hsl(152 58% 48%)"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0.2, 0.6, 0],
            cx: [
              50 + Math.cos(p.angle) * (p.radius / 2),
              50 + Math.cos(p.angle + Math.PI) * (p.radius / 2),
              50 + Math.cos(p.angle + Math.PI * 2) * (p.radius / 2),
            ],
            cy: [
              50 + Math.sin(p.angle) * (p.radius / 2),
              50 + Math.sin(p.angle + Math.PI) * (p.radius / 2),
              50 + Math.sin(p.angle + Math.PI * 2) * (p.radius / 2),
            ],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </g>
  );
}

// ─── Main component ───
export default function AppBootExperience({ dataReady, onComplete }: AppBootExperienceProps) {
  const shouldReduceMotion = useReducedMotion();
  const [stage, setStage] = useState<BootStage>("idle");
  const tonePlayed = useRef(false);
  const minTimeRef = useRef(Date.now());

  // Stage progression
  useEffect(() => {
    if (shouldReduceMotion) {
      // Skip animations entirely
      if (dataReady) {
        setStage("transitioning");
        const t = setTimeout(onComplete, 400);
        return () => clearTimeout(t);
      }
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    // Stage 1: idle → awakening (immediate)
    timers.push(setTimeout(() => setStage("awakening"), 100));

    // Stage 2: awakening → syncing (after ~1.2s)
    timers.push(
      setTimeout(() => {
        setStage("syncing");
        if (!tonePlayed.current) {
          tonePlayed.current = true;
          playBootTone();
          microVibrate(12);
        }
      }, 1200)
    );

    return () => timers.forEach(clearTimeout);
  }, [shouldReduceMotion, dataReady, onComplete]);

  // When data is ready + minimum visual time elapsed → ready → transitioning
  useEffect(() => {
    if (!dataReady || stage === "ready" || stage === "transitioning") return;
    if (stage !== "syncing" && stage !== "awakening") return;

    const elapsed = Date.now() - minTimeRef.current;
    const minDisplay = 2800; // minimum boot animation duration
    const remaining = Math.max(0, minDisplay - elapsed);

    const t1 = setTimeout(() => {
      setStage("ready");
      microVibrate(8);
    }, remaining);

    return () => clearTimeout(t1);
  }, [dataReady, stage]);

  // ready → transitioning after bloom
  useEffect(() => {
    if (stage !== "ready") return;
    const t = setTimeout(() => setStage("transitioning"), 800);
    return () => clearTimeout(t);
  }, [stage]);

  const handleExitComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Derived visual states
  const showNetwork = stage !== "idle";
  const showBrain = stage === "syncing" || stage === "ready" || stage === "transitioning";
  const showBrand = stage === "syncing" || stage === "ready" || stage === "transitioning";
  const isBloom = stage === "ready" || stage === "transitioning";

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {stage !== "transitioning" ? (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(240 30% 8%) 0%, hsl(240 40% 4%) 60%, hsl(0 0% 0%) 100%)",
          }}
        >
          {/* Central visualization */}
          <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px]">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              style={{ filter: "url(#boot-glow)" }}
            >
              <defs>
                <filter id="boot-glow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="halo-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(152 58% 48%)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(152 58% 48%)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Energy halo */}
              <AnimatePresence>
                {isBloom && (
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="url(#halo-grad)"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 2 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Neural network edges */}
              {NEURAL_EDGES.map(([a, b], i) => {
                const na = NEURAL_NODES[a];
                const nb = NEURAL_NODES[b];
                return (
                  <motion.line
                    key={`e-${i}`}
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke="hsl(152 58% 48%)"
                    strokeWidth="0.3"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={
                      showNetwork
                        ? { opacity: showBrain ? 0.5 : 0.2, pathLength: 1 }
                        : { opacity: 0, pathLength: 0 }
                    }
                    transition={{
                      duration: 0.8,
                      delay: i * 0.03,
                      ease: "easeOut",
                    }}
                  />
                );
              })}

              {/* Neural network nodes */}
              {NEURAL_NODES.map((n, i) => (
                <motion.circle
                  key={`n-${i}`}
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill="hsl(152 58% 48%)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    showNetwork
                      ? {
                          opacity: showBrain ? [0.4, 0.9, 0.4] : [0, 0.5, 0],
                          scale: 1,
                        }
                      : { opacity: 0, scale: 0 }
                  }
                  transition={{
                    opacity: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15,
                    },
                    scale: { duration: 0.6, delay: i * 0.04, ease: "easeOut" },
                  }}
                />
              ))}

              {/* Orbiting particles */}
              <OrbitingParticles visible={showBrain} />
            </svg>

            {/* Rotating Logo Video centerpiece */}
            <AnimatePresence>
              {showBrain && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <video
                    src={logoVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-48 h-48 md:w-56 md:h-56 object-contain mix-blend-screen"
                    style={{
                      filter: "drop-shadow(0 0 20px hsl(152 58% 48% / 0.4))",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bloom effect on ready */}
            <AnimatePresence>
              {isBloom && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 0.6, 0], scale: [0.5, 2.5] }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{
                    background:
                      "radial-gradient(circle, hsl(152 58% 48% / 0.4) 0%, transparent 70%)",
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Brand text */}
          <AnimatePresence>
            {showBrand && (
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  className="text-2xl md:text-3xl font-bold tracking-[0.18em] uppercase"
                  style={{
                    color: "hsl(152 58% 48%)",
                    textShadow: "0 0 30px hsl(152 58% 48% / 0.3)",
                  }}
                >
                  FITJOURNEY
                </h1>
                <motion.p
                  className="text-xs md:text-sm tracking-[0.12em] mt-2 uppercase"
                  style={{ color: "hsl(210 20% 60%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Intelligent Clinical Evolution
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtle loading bar */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-[2px] rounded-full overflow-hidden"
            style={{ background: "hsl(210 20% 15%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showNetwork ? 0.7 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, hsl(152 58% 48%), hsl(170 60% 50%))",
              }}
              initial={{ width: "0%" }}
              animate={{ width: dataReady ? "100%" : "70%" }}
              transition={{
                duration: dataReady ? 0.4 : 4,
                ease: dataReady ? "easeOut" : "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
