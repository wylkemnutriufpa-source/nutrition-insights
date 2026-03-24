import { useTimelinePollVote } from "@/hooks/useTimeline";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface Props {
  eventId: string;
  question: string;
  options: string[];
}

export default function TimelinePoll({ eventId, question, options }: Props) {
  const { userVote, voteCounts, totalVotes, castVote } = useTimelinePollVote(eventId);
  const hasVoted = !!userVote;

  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        {question}
      </p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = voteCounts[i] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = userVote?.option_selected === i;

          return (
            <button
              key={i}
              onClick={() => !hasVoted && castVote(i)}
              disabled={hasVoted}
              className={cn(
                "w-full relative rounded-lg border px-3 py-2 text-left text-sm transition-all overflow-hidden",
                hasVoted
                  ? isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                  : "border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
              )}
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={cn("font-medium", isSelected && "text-primary")}>{opt}</span>
                {hasVoted && (
                  <span className="text-xs text-muted-foreground font-semibold">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {hasVoted && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
