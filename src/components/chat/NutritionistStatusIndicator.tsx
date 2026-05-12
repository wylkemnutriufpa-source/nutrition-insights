import { useNutritionistStatus } from "@/hooks/useNutritionistStatus";

interface Props {
  patientId: string | undefined;
  compact?: boolean;
}

export default function NutritionistStatusIndicator({ patientId, compact }: Props) {
  const { label, color } = useNutritionistStatus(patientId);

  const dotColor = color === "green" ? "bg-emerald-500" : color === "yellow" ? "bg-amber-400" : "bg-muted-foreground/40";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor} ${color === "green" ? "animate-pulse" : ""}`} />
        <span className="text-[10px] text-muted-foreground">{color === "green" ? "Online" : color === "yellow" ? "Recente" : "Offline"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${color === "green" ? "animate-pulse" : ""}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
