import { useTimelinePollVote } from "@v1/hooks/useTimeline";
import { cn } from "@v1/lib/utils";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  eventId: string;
  question: string;
  options: string[];
}

export default function TimelinePoll({ eventId, question, options }: Props) {
  const { userVote, voteCounts, totalVotes, castVote } = useTimelinePollVote(eventId);
  const hasVoted = !!userVote;

  return (
    <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-violet-500/[0.06] to-primary/[0.03] border border-violet-500/15">
      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-500" />
        {question}
      </p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = voteCounts[i] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = userVote?.option_selected === i;

          return (
            <motion.button
              key={i}
              onClick={() => !hasVoted && castVote(i)}
              disabled={hasVoted}
              whileHover={!hasVoted ? { scale: 1.01 } : undefined}
              whileTap={!hasVoted ? { scale: 0.98 } : undefined}
              className={cn(
                "w-full relative rounded-xl border px-4 py-2.5 text-left text-sm transition-all overflow-hidden",
                hasVoted
                  ? isSelected
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-border/50 bg-card"
                  : "border-border/50 bg-card hover:border-violet-500/30 hover:bg-violet-500/5 cursor-pointer"
              )}
            >
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-violet-500/10 rounded-xl"
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={cn("font-medium", isSelected && "text-violet-600 dark:text-violet-400")}>{opt}</span>
                {hasVoted && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-muted-foreground font-bold"
                  >
                    {pct}%
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      {hasVoted && (
        <p className="text-[10px] text-muted-foreground mt-2.5 text-center font-medium">
          {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
