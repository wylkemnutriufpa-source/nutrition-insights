/**
 * Shows patient feedback summary for a meal plan (nutritionist view).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Badge } from "@v1/components/ui/badge";

export default function PatientFeedbackSummary({ mealPlanId }: { mealPlanId: string }) {
  const { data: feedback = [] } = useQuery({
    queryKey: ["patient-feedback", mealPlanId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("patient_meal_feedback")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    staleTime: 60000,
  });

  if (feedback.length === 0) return null;

  const likes = feedback.filter((f: any) => f.feedback_type === "like").length;
  const dislikes = feedback.filter((f: any) => f.feedback_type === "dislike").length;
  const comments = feedback.filter((f: any) => f.feedback_type === "comment" && f.comment);

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground font-medium">Feedback do paciente:</span>
        {likes > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="w-3 h-3" /> {likes}
          </Badge>
        )}
        {dislikes > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/10 text-destructive">
            <ThumbsDown className="w-3 h-3" /> {dislikes}
          </Badge>
        )}
        {comments.length > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <MessageSquare className="w-3 h-3" /> {comments.length}
          </Badge>
        )}
      </div>
      {comments.length > 0 && (
        <div className="mt-2 space-y-1">
          {comments.slice(0, 3).map((c: any) => (
            <p key={c.id} className="text-[11px] text-muted-foreground bg-background/50 rounded px-2 py-1">
              "{c.comment}" — <span className="text-[10px]">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
