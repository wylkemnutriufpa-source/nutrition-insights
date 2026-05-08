import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OrbitalOption {
  id: string;
  label: string;
  description: string;
  helperText?: string;
  icon?: React.ElementType;
  emoji?: string;
}

function OrbitalIcon({ option, className }: { option: OrbitalOption; className?: string }) {
  if (option.icon) {
    const Icon = option.icon;
    return <Icon className={className} />;
  }
  if (option.emoji) {
    return <span className="text-xl">{option.emoji}</span>;
  }
  return <Sparkles className={className} />;
}

interface RadialOrbitalSelectorProps {
  title: string;
  subtitle?: string;
  options: OrbitalOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  onConfirm?: (id: string) => void;
  confirmLabel?: string;
  showConfirmButton?: boolean;
}

const EASE_PREMIUM = [0.22, 1, 0.36, 1];

export function RadialOrbitalSelector({
  title,
  subtitle,
  options,
  value,
  defaultValue,
  onChange,
  onConfirm,
  confirmLabel = "Confirmar",
  showConfirmButton = true,
}: RadialOrbitalSelectorProps) {
  const [selected, setSelected] = useState<string>(value ?? defaultValue ?? "");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      onChange?.(id);
    },
    [onChange]
  );

  const handleConfirm = useCallback(() => {
    if (selected) onConfirm?.(selected);
  }, [selected, onConfirm]);

  const activeOption = useMemo(
    () => options.find((o) => o.id === selected),
    [options, selected]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = options.findIndex((o) => o.id === selected);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleSelect(options[(idx + 1) % options.length].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handleSelect(options[(idx - 1 + options.length) % options.length].id);
      } else if (e.key === "Enter" && selected) {
        e.preventDefault();
        handleConfirm();
      }
    },
    [options, selected, handleSelect, handleConfirm]
  );

  if (isMobile) {
    return (
      <MobileSelector
        title={title}
        subtitle={subtitle}
        options={options}
        selected={selected}
        activeOption={activeOption}
        onSelect={handleSelect}
        onConfirm={handleConfirm}
        confirmLabel={confirmLabel}
        showConfirmButton={showConfirmButton}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <DesktopOrbital
      title={title}
      subtitle={subtitle}
      options={options}
      selected={selected}
      activeOption={activeOption}
      onSelect={handleSelect}
      onConfirm={handleConfirm}
      confirmLabel={confirmLabel}
      showConfirmButton={showConfirmButton}
      onKeyDown={handleKeyDown}
    />
  );
}

// ─── Desktop: Rotating orbital with auto-rotation & inertia ───
function DesktopOrbital({
  title,
  subtitle,
  options,
  selected,
  activeOption,
  onSelect,
  onConfirm,
  confirmLabel,
  showConfirmButton,
  onKeyDown,
}: {
  title: string;
  subtitle?: string;
  options: OrbitalOption[];
  selected: string;
  activeOption?: OrbitalOption;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
  showConfirmButton: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const reduced = useReducedMotion();
  const radius = 190;
  const containerSize = radius * 2 + 180;
  const selectedIndex = options.findIndex((o) => o.id === selected);
  const sliceAngle = 360 / options.length;

  // Auto-rotation: very slow continuous drift when no selection
  const autoRotationRef = useRef(0);
  const [autoAngle, setAutoAngle] = useState(0);

  useEffect(() => {
    if (reduced || selected) return;
    let raf: number;
    const tick = () => {
      autoRotationRef.current += 0.015; // extremely slow
      setAutoAngle(autoRotationRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, selected]);

  // When selected, snap to position (12 o'clock)
  const targetRotation = selectedIndex >= 0 ? -selectedIndex * sliceAngle : autoAngle;

  return (
    <div
      className="relative flex flex-col items-center gap-4"
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="radiogroup"
      aria-label={title}
    >
      {/* Title */}
      <div className="text-center mb-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Orbital container */}
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        {/* Ambient glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: radius * 2 + 60,
            height: radius * 2 + 60,
            background: "radial-gradient(circle, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
          }}
        />

        {/* Orbital rings */}
        <div
          className="absolute rounded-full border border-primary/10"
          style={{
            width: radius * 2,
            height: radius * 2,
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          className="absolute rounded-full border border-primary/5"
          style={{
            width: radius * 2 + 44,
            height: radius * 2 + 44,
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Focal glow at top (12 o'clock) */}
        {selected && !reduced && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-0"
            style={{ top: `calc(50% - ${radius}px - 12px)` }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.1) 50%, transparent 80%)",
                filter: "blur(12px)",
              }}
            />
          </motion.div>
        )}

        {/* Center panel */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <CenterPanel option={activeOption} showConfirmButton={showConfirmButton} confirmLabel={confirmLabel} onConfirm={onConfirm} />
        </div>

        {/* Rotating orbit group */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: targetRotation }}
          transition={
            selected
              ? { type: "spring", stiffness: 45, damping: 14, mass: 1.2 }
              : { duration: 0.1, ease: "linear" }
          }
        >
          {options.map((opt, i) => {
            const baseAngle = -90 + i * sliceAngle;
            const rad = (baseAngle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const isActive = opt.id === selected;
            // Icon handled by OrbitalIcon helper
            const counterRotation = -targetRotation;

            return (
              <motion.div
                key={opt.id}
                className="absolute z-20"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Energy rings for active item */}
                {isActive && !reduced && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        margin: "-6px",
                        border: "1.5px solid hsl(var(--primary) / 0.4)",
                        boxShadow: "0 0 18px hsl(var(--primary) / 0.2), 0 0 6px hsl(var(--accent) / 0.15)",
                      }}
                      animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.04, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ margin: "-12px" }}
                      animate={{ opacity: [0, 0.3, 0], scale: [0.95, 1.08, 0.95] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    >
                      <div
                        className="w-full h-full rounded-2xl"
                        style={{
                          border: "1px solid hsl(var(--primary) / 0.15)",
                          boxShadow: "0 0 24px hsl(var(--primary) / 0.1), 0 0 8px hsl(var(--accent) / 0.08)",
                        }}
                      />
                    </motion.div>
                    {/* Gold micro particle */}
                    <motion.div
                      className="absolute -top-3 -right-1 w-1.5 h-1.5 rounded-full pointer-events-none"
                      style={{ background: "hsl(var(--accent))" }}
                      animate={{
                        y: [0, -6, 0],
                        opacity: [0.3, 0.7, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>
                )}

                <motion.button
                  role="radio"
                  aria-checked={isActive}
                  aria-label={opt.label}
                  onClick={() => onSelect(opt.id)}
                  animate={{
                    rotate: counterRotation,
                    opacity: selected && !isActive ? 0.55 : 1,
                    scale: isActive ? 1 : selected ? 0.92 : 1,
                  }}
                  transition={{
                    rotate: selected
                      ? { type: "spring", stiffness: 45, damping: 14, mass: 1.2 }
                      : { duration: 0.1, ease: "linear" },
                    opacity: { duration: 0.4, ease: EASE_PREMIUM as any },
                    scale: { duration: 0.4, ease: EASE_PREMIUM as any },
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl px-4 py-3 transition-colors duration-300 cursor-pointer border",
                    "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-primary/15 border-primary/50"
                      : "bg-card/60 border-border/40 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30"
                  )}
                  style={{
                    minWidth: 110,
                    boxShadow: isActive
                      ? "0 0 20px hsl(var(--primary) / 0.2), 0 4px 12px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(var(--accent) / 0.1)"
                      : "0 2px 8px hsl(0 0% 0% / 0.15)",
                  }}
                  whileHover={{ scale: isActive ? 1.08 : 1.06 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Check badge */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                      }}
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}

                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isActive ? "text-primary" : "bg-muted/50 text-muted-foreground"
                    )}
                    style={isActive ? {
                      background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.1))",
                    } : undefined}
                  >
                    <OrbitalIcon option={opt} className="w-5 h-5" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold whitespace-nowrap",
                      isActive ? "text-primary" : "text-foreground/80"
                    )}
                  >
                    {opt.label}
                  </span>
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Center ambient glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Mobile: Stacked guided layout ───
function MobileSelector({
  title,
  subtitle,
  options,
  selected,
  activeOption,
  onSelect,
  onConfirm,
  confirmLabel,
  showConfirmButton,
  onKeyDown,
}: {
  title: string;
  subtitle?: string;
  options: OrbitalOption[];
  selected: string;
  activeOption?: OrbitalOption;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
  showConfirmButton: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto" tabIndex={0} onKeyDown={onKeyDown} role="radiogroup" aria-label={title}>
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isActive = opt.id === selected;
          // Icon handled by OrbitalIcon helper
          return (
            <motion.button
              key={opt.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(opt.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/60 hover:border-primary/40"
              )}
              style={isActive ? {
                boxShadow: "0 0 20px hsl(var(--primary) / 0.2), 0 0 6px hsl(var(--accent) / 0.12), 0 4px 16px hsl(0 0% 0% / 0.2)",
              } : undefined}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: isActive ? 1 : selected ? 0.65 : 1,
                y: 0,
                scale: isActive ? 1 : selected ? 0.97 : 1,
              }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: EASE_PREMIUM as any }}
              whileTap={{ scale: 0.96 }}
            >
              {isActive && !reduced && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: "1px solid hsl(var(--primary) / 0.3)" }}
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Gold micro particle */}
                  <motion.div
                    className="absolute top-1 right-8 w-1 h-1 rounded-full pointer-events-none"
                    style={{ background: "hsl(var(--accent))" }}
                    animate={{ y: [0, -4, 0], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  isActive ? "text-primary" : "bg-muted/50 text-muted-foreground"
                )}
                style={isActive ? {
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.1))",
                } : undefined}
              >
                <OrbitalIcon option={opt} className="w-6 h-6" />
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isActive ? "text-primary" : "text-foreground/80"
                )}
              >
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeOption && (
          <motion.div
            key={activeOption.id}
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_PREMIUM as any }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2"
              style={{
                boxShadow: "inset 0 1px 0 hsl(var(--accent) / 0.08), 0 0 12px hsl(var(--primary) / 0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <OrbitalIcon option={activeOption} className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">{activeOption.label}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{activeOption.description}</p>
              {activeOption.helperText && (
                <p className="text-xs text-accent italic">
                  💡 {activeOption.helperText}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showConfirmButton && selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={onConfirm} className="w-full gap-2 h-12 text-base font-semibold">
            <Sparkles className="w-4 h-4" />
            {confirmLabel}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Shared center panel ───
function CenterPanel({
  option,
  showConfirmButton,
  confirmLabel,
  onConfirm,
}: {
  option?: OrbitalOption;
  showConfirmButton: boolean;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <div
      className="w-52 h-52 rounded-3xl border border-primary/20 bg-card/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center relative overflow-hidden"
      style={{
        boxShadow: "0 0 30px hsl(var(--primary) / 0.08), 0 8px 32px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(var(--accent) / 0.06)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <AnimatePresence mode="wait">
        {option ? (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: EASE_PREMIUM as any }}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.1))",
              }}
            >
              <OrbitalIcon option={option} className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">{option.label}</span>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
              {option.description}
            </p>
            {showConfirmButton && (
              <Button size="sm" onClick={onConfirm} className="mt-1 h-7 text-xs gap-1 px-3">
                <Check className="w-3 h-3" />
                {confirmLabel}
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground"
          >
            <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs">Selecione uma opção</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}