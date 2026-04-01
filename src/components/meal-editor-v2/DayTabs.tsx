import { cn } from "@/lib/utils";

const DAYS = [
  { key: 0, label: "Domingo", short: "Dom" },
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
];

interface Props {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  getDayCount?: (day: number) => number;
}

export function DayTabs({ selectedDay, onSelectDay, getDayCount }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {DAYS.map((day) => {
        const count = getDayCount?.(day.key) ?? 0;
        const isActive = selectedDay === day.key;
        return (
          <button
            key={day.key}
            type="button"
            onClick={() => onSelectDay(day.key)}
            className={cn(
              "relative flex flex-col items-center min-w-[52px] px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0",
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
          >
            <span className="font-bold text-[11px]">{day.short}</span>
            {count > 0 && (
              <span className={cn(
                "text-[9px] mt-0.5",
                isActive ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {count} itens
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
