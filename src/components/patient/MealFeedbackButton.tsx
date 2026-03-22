import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MealFeedbackButtonProps {
  mealPlanId: string;
  mealPlanItemId?: string;
  mealType: string;
  existingRating?: "liked" | "disliked" | null;
  onFeedback?: (rating: "liked" | "disliked") => void;
}

export default function MealFeedbackButton({
  mealPlanId,
  mealPlanItemId,
  mealType,
  existingRating,
  onFeedback,
}: MealFeedbackButtonProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<"liked" | "disliked" | null>(existingRating || null);
  const [saving, setSaving] = useState(false);

  const submit = async (value: "liked" | "disliked") => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (rating === value) {
        // Toggle off
        await (supabase as any).from("meal_feedback")
          .delete()
          .eq("patient_id", user.id)
          .eq("meal_plan_id", mealPlanId)
          .eq("meal_type", mealType);
        setRating(null);
      } else {
        // Upsert
        if (rating) {
          await (supabase as any).from("meal_feedback")
            .delete()
            .eq("patient_id", user.id)
            .eq("meal_plan_id", mealPlanId)
            .eq("meal_type", mealType);
        }
        await (supabase as any).from("meal_feedback").insert({
          patient_id: user.id,
          meal_plan_id: mealPlanId,
          meal_plan_item_id: mealPlanItemId || null,
          meal_type: mealType,
          rating: value,
        });
        setRating(value);
        onFeedback?.(value);
      }
    } catch {
      toast.error("Erro ao salvar feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => submit("liked")}
        disabled={saving}
        className={cn(
          "p-1.5 rounded-full transition-all",
          rating === "liked"
            ? "bg-emerald-500/20 text-emerald-500"
            : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
        )}
        title="Gostei"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => submit("disliked")}
        disabled={saving}
        className={cn(
          "p-1.5 rounded-full transition-all",
          rating === "disliked"
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
            {rating === "liked" ? "👍" : "👎"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
