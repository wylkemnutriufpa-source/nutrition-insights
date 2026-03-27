/**
 * Orbital-themed inputs for the Smart Anamnesis.
 * Every question type gets the premium orbital treatment:
 * energy glows, spring animations, ambient particles, neural transitions.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Sparkles, Clock, Droplets, Type, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

// ─── Shared: Orbital Glow Ring ───
function OrbitalGlowRing({ active, children, className }: { active?: boolean; children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("relative", className)}>
      {active && !reduced && (
        <motion.div
          className="absolute -inset-1 rounded-3xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 70%)",
            border: "1px solid hsl(var(--primary) / 0.15)",
          }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.99, 1.01, 0.99] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Orbital Header (title + subtitle with energy line) ───
export function OrbitalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-6 relative">
      <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
      <motion.div
        className="mx-auto mt-3 h-[2px] rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.3), transparent)",
          width: "60%",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SINGLE SELECT — Orbital card grid with energy effects
// ═══════════════════════════════════════════════════════
interface OrbitalOption {
  label: string;
  emoji: string;
  value: string;
}

export function OrbitalSingleSelect({
  title, subtitle, options, value, onChange,
}: {
  title: string;
  subtitle?: string;
  options: OrbitalOption[];
  value?: string;
  onChange: (v: string) => void;
}) {
  const reduced = useReducedMotion();
  const cols = options.length <= 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="w-full max-w-lg mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      <div className={`grid ${cols} gap-3`}>
        {options.map((opt, i) => {
          const isActive = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/60 hover:border-primary/40 hover:bg-card/80"
              )}
              style={isActive ? {
                boxShadow: "0 0 24px hsl(var(--primary) / 0.2), 0 0 8px hsl(var(--accent) / 0.12), 0 4px 16px hsl(0 0% 0% / 0.15)",
              } : {
                boxShadow: "0 2px 8px hsl(0 0% 0% / 0.08)",
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: isActive ? 1 : value ? 0.65 : 1,
                y: 0,
                scale: isActive ? 1.02 : value ? 0.97 : 1,
              }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: EASE_PREMIUM }}
              whileHover={{ scale: isActive ? 1.04 : 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {/* Check badge */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}

              {/* Energy ring */}
              {isActive && !reduced && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: "1px solid hsl(var(--primary) / 0.3)" }}
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute -top-2 right-6 w-1.5 h-1.5 rounded-full pointer-events-none"
                    style={{ background: "hsl(var(--accent))" }}
                    animate={{ y: [0, -5, 0], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}

              <span className="text-3xl">{opt.emoji}</span>
              <span className={cn(
                "text-sm font-semibold",
                isActive ? "text-primary" : "text-foreground/80"
              )}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MULTI SELECT — Orbital with toggle + count indicator
// ═══════════════════════════════════════════════════════
export function OrbitalMultiSelect({
  title, subtitle, options, value, onChange,
}: {
  title: string;
  subtitle?: string;
  options: OrbitalOption[];
  value?: string[];
  onChange: (v: string[]) => void;
}) {
  const reduced = useReducedMotion();
  const selected = value || [];
  const count = selected.length;

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      {/* Selection count indicator */}
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{count} selecionado{count !== 1 ? "s" : ""}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map((opt, i) => {
          const isActive = selected.includes(opt.value);
          return (
            <motion.button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/60 hover:border-primary/40 hover:bg-card/80"
              )}
              style={isActive ? {
                boxShadow: "0 0 20px hsl(var(--primary) / 0.18), 0 4px 12px hsl(0 0% 0% / 0.12)",
              } : {
                boxShadow: "0 2px 6px hsl(0 0% 0% / 0.06)",
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, scale: isActive ? 1.02 : 1 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: EASE_PREMIUM }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}

              {isActive && !reduced && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: "1px solid hsl(var(--primary) / 0.25)" }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              <span className="text-2xl">{opt.emoji}</span>
              <span className={cn(
                "text-xs font-semibold",
                isActive ? "text-primary" : "text-foreground/80"
              )}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SLIDER — Orbital ring gauge with energy pulse
// ═══════════════════════════════════════════════════════
export function OrbitalSlider({
  title, subtitle, value, onChange, min, max, step, unit,
}: {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  const reduced = useReducedMotion();
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      {/* Central value display with orbital ring */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Ambient ring */}
        <div className="absolute w-40 h-40 rounded-full border border-primary/10" />
        {!reduced && (
          <motion.div
            className="absolute w-44 h-44 rounded-full pointer-events-none"
            style={{
              border: "1.5px solid transparent",
              borderTopColor: "hsl(var(--primary) / 0.4)",
              borderRightColor: "hsl(var(--accent) / 0.2)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Value core */}
        <motion.div
          className="relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center border border-primary/20 bg-card/80 backdrop-blur-md"
          style={{
            boxShadow: "0 0 30px hsl(var(--primary) / 0.1), 0 8px 24px hsl(0 0% 0% / 0.15), inset 0 1px 0 hsl(var(--accent) / 0.08)",
          }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-4xl font-display font-bold text-primary">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </motion.div>
      </div>

      {/* Slider track with orbital styling */}
      <div className="relative px-2">
        <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden border border-border/50">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent) / 0.7))",
              width: `${percent}%`,
            }}
            layout
            transition={{ duration: 0.2, ease: EASE_PREMIUM }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NUMBER — Orbital number input with glow focus
// ═══════════════════════════════════════════════════════
export function OrbitalNumberInput({
  title, subtitle, value, onChange, min, max, unit, placeholder,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="w-full max-w-sm mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      <OrbitalGlowRing active={focused}>
        <div className="relative">
          {/* Ambient ring around input */}
          {!reduced && (
            <motion.div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
              }}
              animate={focused ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.3 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "relative z-10 w-full text-center text-4xl font-display font-bold rounded-2xl px-6 py-5 transition-all duration-300",
              "bg-card/80 backdrop-blur-sm border-2 focus:outline-none",
              focused
                ? "border-primary shadow-[0_0_24px_hsl(var(--primary)/0.15)]"
                : "border-border hover:border-primary/30"
            )}
          />
          {unit && (
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground z-10">
              {unit}
            </span>
          )}
        </div>
      </OrbitalGlowRing>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TEXT — Orbital textarea with glow
// ═══════════════════════════════════════════════════════
export function OrbitalTextInput({
  title, subtitle, value, onChange, placeholder,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="w-full max-w-md mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      <OrbitalGlowRing active={focused}>
        <div className="relative">
          {!reduced && (
            <motion.div
              className="absolute -inset-3 rounded-3xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
              }}
              animate={focused ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.2 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <div className="relative z-10">
            <Type className={cn(
              "absolute left-4 top-4 w-4 h-4 transition-colors",
              focused ? "text-primary" : "text-muted-foreground"
            )} />
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={3}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                "w-full rounded-2xl pl-11 pr-4 py-4 transition-all duration-300 resize-none text-sm",
                "bg-card/80 backdrop-blur-sm border-2 focus:outline-none",
                focused
                  ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.12)]"
                  : "border-border hover:border-primary/30"
              )}
            />
          </div>
        </div>
      </OrbitalGlowRing>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TIME — Orbital clock input with rotating ring
// ═══════════════════════════════════════════════════════
export function OrbitalTimeInput({
  title, subtitle, value, onChange, placeholder,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();

  // Parse hours for the rotating hand effect
  const hours = value ? parseInt(value.split(":")[0]) || 0 : 0;
  const minutes = value ? parseInt(value.split(":")[1]) || 0 : 0;
  const handAngle = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

  return (
    <div className="w-full max-w-xs mx-auto">
      <OrbitalHeader title={title} subtitle={subtitle} />

      <div className="relative flex flex-col items-center gap-6">
        {/* Orbital clock ring */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border border-border/40" />
          {!reduced && (
            <motion.div
              className="absolute inset-[-4px] rounded-full pointer-events-none"
              style={{
                border: "1.5px solid transparent",
                borderTopColor: focused ? "hsl(var(--primary) / 0.5)" : "hsl(var(--primary) / 0.2)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Clock markers */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
            const a = (h / 12) * 360 - 90;
            const rad = (a * Math.PI) / 180;
            const x = Math.cos(rad) * 62;
            const y = Math.sin(rad) * 62;
            const isHour = h % 3 === 0;
            return (
              <div
                key={h}
                className={cn(
                  "absolute rounded-full",
                  isHour ? "w-2 h-2 bg-primary/40" : "w-1 h-1 bg-border"
                )}
                style={{
                  left: `calc(50% + ${x}px - ${isHour ? 4 : 2}px)`,
                  top: `calc(50% + ${y}px - ${isHour ? 4 : 2}px)`,
                }}
              />
            );
          })}

          {/* Hand indicator */}
          {value && (
            <motion.div
              className="absolute w-0.5 origin-bottom rounded-full"
              style={{
                height: 42,
                left: "calc(50% - 1px)",
                bottom: "50%",
                background: "linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent) / 0.6))",
                boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
              }}
              animate={{ rotate: handAngle }}
              transition={{ type: "spring", stiffness: 60, damping: 12 }}
            />
          )}

          {/* Center dot */}
          <div className="absolute w-3 h-3 rounded-full bg-primary z-10 shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />

          {/* Clock icon */}
          <Clock className={cn(
            "absolute bottom-4 w-4 h-4 transition-colors",
            focused ? "text-primary" : "text-muted-foreground/50"
          )} />
        </div>

        {/* Time input */}
        <OrbitalGlowRing active={focused}>
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "relative z-10 w-full text-center text-3xl font-display font-bold rounded-2xl px-6 py-4 transition-all duration-300",
              "bg-card/80 backdrop-blur-sm border-2 focus:outline-none",
              focused
                ? "border-primary shadow-[0_0_24px_hsl(var(--primary)/0.15)]"
                : "border-border hover:border-primary/30"
            )}
          />
        </OrbitalGlowRing>
      </div>
    </div>
  );
}
