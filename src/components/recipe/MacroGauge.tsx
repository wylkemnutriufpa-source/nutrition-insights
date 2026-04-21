import { motion } from "framer-motion";
import { safeNum, fmtMacro } from "@/lib/formatMacros";

interface Props {
  label: string;
  value: number;
  target?: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function MacroGauge({ label, value, target, unit, color, icon }: Props) {
  const safeValue = safeNum(value);
  const safeTarget = safeNum(target);
  const pct = safeTarget > 0 ? Math.min((safeValue / safeTarget) * 100, 150) : 0;
  const overTarget = safeTarget > 0 ? safeValue > safeTarget * 1.05 : false;
  const atTarget = safeTarget > 0 ? Math.abs(safeValue - safeTarget) / safeTarget <= 0.05 : false;

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
        <p className="text-sm font-bold tabular-nums">{fmtMacro(safeValue)}{unit}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {safeTarget > 0 && (
          <p className={`text-[9px] font-medium ${atTarget ? "text-emerald-500" : overTarget ? "text-destructive" : "text-muted-foreground"}`}>
            meta: {fmtMacro(safeTarget)}
          </p>
        )}
      </div>
    </div>
  );
}
