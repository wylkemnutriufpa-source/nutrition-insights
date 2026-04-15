import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number;
  target?: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function MacroGauge({ label, value, target, unit, color, icon }: Props) {
  const pct = target && target > 0 ? Math.min((value / target) * 100, 150) : 0;
  const overTarget = target ? value > target * 1.05 : false;
  const atTarget = target ? Math.abs(value - target) / target <= 0.05 : false;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
      <div className="relative w-14 h-14">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted/30" strokeWidth="3" />
          <motion.circle
            cx="18" cy="18" r="15.9" fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="100"
            className={overTarget ? "stroke-destructive" : atTarget ? "stroke-emerald-500" : `stroke-${color}`}
            style={{ stroke: overTarget ? "hsl(var(--destructive))" : atTarget ? "#10b981" : undefined }}
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - Math.min(pct, 100) }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold tabular-nums">{Math.round(value)}{unit}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {target != null && target > 0 && (
          <p className={`text-[9px] font-medium ${atTarget ? "text-emerald-500" : overTarget ? "text-destructive" : "text-muted-foreground"}`}>
            meta: {Math.round(target)}
          </p>
        )}
      </div>
    </div>
  );
}
