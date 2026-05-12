import { UtensilsCrossed } from "lucide-react";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-32 w-full",
};

const iconMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export default function MealVisualPlaceholder({ className = "", size = "md" }: Props) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/5 via-muted/40 to-primary/10 border border-border/30 ${sizeMap[size]} ${className}`}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <UtensilsCrossed className={`${iconMap[size]} text-primary/40`} />
        </div>
        {size === "lg" && (
          <span className="text-[10px] text-muted-foreground/60 font-medium">Sem imagem</span>
        )}
      </div>
    </div>
  );
}
