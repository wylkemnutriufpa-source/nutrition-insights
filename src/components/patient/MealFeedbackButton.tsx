import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MealFeedbackButtonProps {
  mealPlanId: string;
  mealPlanItemId?: string;
  mealType: string;
  existingRating?: "like" | "dislike" | null;
  onFeedback?: (rating: "like" | "dislike") => void;
}

export default function MealFeedbackButton({
  mealPlanId,
  mealPlanItemId,
  mealType,
  existingRating,
  onFeedback,
}: MealFeedbackButtonProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<"like" | "dislike" | null>(existingRating || null);
  const [saving, setSaving] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const submit = async (value: "like" | "dislike") => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (rating === value) {
        setRating(null);
      } else {
        await (supabase as any).from("patient_meal_feedback").insert({
          patient_id: user.id,
          meal_plan_id: mealPlanId,
          meal_plan_item_id: mealPlanItemId || null,
          feedback_type: value,
          comment: null,
        });
        setRating(value);
        onFeedback?.(value);
        if (value === "dislike") setShowComment(true);
      }
    } catch {
      toast.error("Erro ao salvar feedback");
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async () => {
    if (!user || !comment.trim()) return;
    try {
      await (supabase as any).from("patient_meal_feedback").insert({
        patient_id: user.id,
        meal_plan_id: mealPlanId,
        meal_plan_item_id: mealPlanItemId || null,
        feedback_type: "comment",
        comment: comment.trim(),
      });
      toast.success("Comentário enviado!");
      setShowComment(false);
      setComment("");
    } catch {
      toast.error("Erro ao enviar comentário");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => submit("like")}
          disabled={saving}
          className={cn(
            "p-1.5 rounded-full transition-all",
            rating === "like"
              ? "bg-emerald-500/20 text-emerald-500"
              : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
          )}
          title="Gostei"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => submit("dislike")}
          disabled={saving}
          className={cn(
            "p-1.5 rounded-full transition-all",
            rating === "dislike"
              ? "bg-destructive/20 text-destructive"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
          title="Não gostei"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </motion.button>
        <AnimatePresence>
          {rating && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[10px] text-muted-foreground ml-0.5"
            >
              {rating === "like" ? "👍" : "👎"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-1.5 items-center"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que não gostou?"
              className="flex-1 text-xs bg-muted/30 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={submitComment}
              className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Enviar"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
