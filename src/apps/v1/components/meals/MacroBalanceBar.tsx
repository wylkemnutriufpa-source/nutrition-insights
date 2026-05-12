import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@v1/components/ui/tooltip";

interface MacroBalanceBarProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  compact?: boolean;
}

import { safeNum } from "@v1/lib/formatMacros";

export default function MacroBalanceBar({ protein, carbs, fat, calories, compact = false }: MacroBalanceBarProps) {
  const protCal = safeNum(protein) * 4;
  const carbCal = safeNum(carbs) * 4;
  const fatCal = safeNum(fat) * 9;
  const total = protCal + carbCal + fatCal;

  if (total <= 0) return null;

  const protPct = Math.round((protCal / total) * 100);
  const carbPct = Math.round((carbCal / total) * 100);
  const fatPct = Math.max(0, 100 - protPct - carbPct);

  // Ideal ranges
  const protIdeal = protPct >= 20 && protPct <= 35;
  const carbIdeal = carbPct >= 40 && carbPct <= 60;
  const fatIdeal = fatPct >= 20 && fatPct <= 35;
  const balanced = protIdeal && carbIdeal && fatIdeal;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div className="flex h-1.5 w-full min-w-[40px] rounded-full overflow-hidden bg-secondary">
                <div className="bg-red-400 transition-all" style={{ width: `${protPct}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${carbPct}%` }} />
                <div className="bg-blue-400 transition-all" style={{ width: `${fatPct}%` }} />
              </div>
              {balanced && <span className="text-[8px]">✅</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>P: {protPct}% • C: {carbPct}% • G: {fatPct}%</p>
            <p className="text-muted-foreground">{balanced ? "Distribuição equilibrada ✓" : "Fora do ideal"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1.5" data-macro-tile="balance-bar">
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-secondary">
        <div className="bg-red-400 transition-all duration-500" style={{ width: `${protPct}%` }} />
        <div className="bg-amber-400 transition-all duration-500" style={{ width: `${carbPct}%` }} />
        <div className="bg-blue-400 transition-all duration-500" style={{ width: `${fatPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className={`flex items-center gap-1 ${protIdeal ? "text-foreground" : "text-orange-500"}`} data-macro="protein-pct" data-macro-value="protein-pct">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          P: {protPct}%
        </span>
        <span className={`flex items-center gap-1 ${carbIdeal ? "text-foreground" : "text-orange-500"}`} data-macro="carbs-pct" data-macro-value="carbs-pct">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          C: {carbPct}%
        </span>
        <span className={`flex items-center gap-1 ${fatIdeal ? "text-foreground" : "text-orange-500"}`} data-macro="fat-pct" data-macro-value="fat-pct">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          G: {fatPct}%
        </span>
        {balanced && <span className="text-green-500 font-medium">Equilibrado ✓</span>}
      </div>
    </div>
  );
}
