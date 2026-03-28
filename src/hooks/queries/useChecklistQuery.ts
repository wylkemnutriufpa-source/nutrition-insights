import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import { offlineQueue } from "@/lib/offlineSync";

export interface ChecklistTask {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  completed: boolean;
  completed_at: string | null;
  date: string;
}

export function useChecklistTasks(date: string) {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: queryKeys.checklist.tasks(user?.id ?? "", date, tenantId),
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await withTenantFilter(
        supabase
          .from("checklist_tasks")
          .select("*")
          .eq("patient_id", user!.id)
          .eq("date", date)
          .order("category")
          .order("created_at"),
        tenantId
      );
      return (data || []) as ChecklistTask[];
    },
  });
}

export function useToggleChecklistTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const inflightRef = React.useRef<Set<string>>(new Set());

  return useMutation({
    mutationFn: async ({ task, date }: { task: ChecklistTask; date: string }) => {
      // Client-side rate limit: prevent double-toggle on same task
      if (inflightRef.current.has(task.id)) {
        throw new Error("__debounced__");
      }
      inflightRef.current.add(task.id);
      const newCompleted = !task.completed;
      const update = {
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      };

      if (!navigator.onLine) {
        // Queue for later sync
        offlineQueue.add({
          type: "checklist_toggle",
          table: "checklist_tasks",
          id: task.id,
          data: update,
          timestamp: Date.now(),
        });
        return { ...task, ...update };
      }

      const { error } = await supabase
        .from("checklist_tasks")
        .update(update)
        .eq("id", task.id);
      if (error) throw error;
      return { ...task, ...update };
    },
    onMutate: async ({ task, date }) => {
      // Optimistic update
      const key = queryKeys.checklist.tasks(user?.id ?? "", date, tenantId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChecklistTask[]>(key);
      queryClient.setQueryData<ChecklistTask[]>(key, (old) =>
        (old || []).map((t) =>
          t.id === task.id
            ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null }
            : t
        )
      );
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
      // Don't show error for debounced calls
      if (_err instanceof Error && _err.message === "__debounced__") return;
      if (navigator.onLine) toast.error("Erro ao atualizar tarefa");
    },
    onSettled: (_data, _err, vars) => {
      inflightRef.current.delete(vars.task.id);
    },
  });
}
