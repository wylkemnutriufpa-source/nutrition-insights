import type { TrainerAnamnesisData } from "./types";
import { GOAL_OPTIONS } from "./types";

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

export default function StepGoals({ data, onChange }: Props) {
  const selectPrimary = (key: string) => {
    onChange({
      primary_goal: key,
      secondary_goals: data.secondary_goals.filter(g => g !== key),
    });
  };

  const toggleSecondary = (key: string) => {
    if (key === data.primary_goal) return;
    const list = data.secondary_goals;
    onChange({
      secondary_goals: list.includes(key) ? list.filter(g => g !== key) : [...list, key],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-3 block">Objetivo Principal</label>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map(g => (
            <button
              key={g.key}
              onClick={() => selectPrimary(g.key)}
              className={`p-4 rounded-xl text-center transition-all ${
                data.primary_goal === g.key
                  ? "bg-primary/15 border-2 border-primary text-primary shadow-sm"
                  : "bg-muted/50 border border-transparent text-muted-foreground hover:border-border"
              }`}
            >
              <div className="text-2xl mb-1">{g.icon}</div>
              <div className="text-sm font-medium">{g.label}</div>
              {data.primary_goal === g.key && (
                <div className="text-[10px] mt-1 text-primary font-semibold">PRINCIPAL</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {data.primary_goal && (
        <div>
          <label className="text-sm font-medium mb-3 block">Objetivos Secundários <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_OPTIONS.filter(g => g.key !== data.primary_goal).map(g => (
              <button
                key={g.key}
                onClick={() => toggleSecondary(g.key)}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  data.secondary_goals.includes(g.key)
                    ? "bg-accent text-accent-foreground border border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
