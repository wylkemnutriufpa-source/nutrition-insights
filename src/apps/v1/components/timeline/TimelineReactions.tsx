import { useTimelineReactions } from "@v1/hooks/useTimeline";
import { cn } from "@v1/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_OPTIONS = ["❤️", "🔥", "👏", "💪", "🎉", "⭐"];

interface Props {
  eventId: string;
}

export default function TimelineReactions({ eventId }: Props) {
  const { grouped, toggleReaction } = useTimelineReactions(eventId);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
        <motion.button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          whileTap={{ scale: 0.85 }}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
            userReacted
              ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
              : "bg-muted/60 border-border/50 text-muted-foreground hover:bg-muted hover:border-border"
          )}
        >
          <motion.span
            key={`${emoji}-${count}`}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {emoji}
          </motion.span>
          <span className="font-semibold">{count}</span>
        </motion.button>
      ))}

      <div className="relative">
        <motion.button
          onClick={() => setShowPicker(!showPicker)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          +
        </motion.button>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 flex gap-1 bg-card border border-border rounded-xl p-2 shadow-xl z-20"
            >
              {EMOJI_OPTIONS.map((e) => (
                <motion.button
                  key={e}
                  onClick={() => { toggleReaction(e); setShowPicker(false); }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-base transition-colors"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
