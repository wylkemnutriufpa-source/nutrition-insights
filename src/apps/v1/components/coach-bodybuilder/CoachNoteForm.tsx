import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Textarea } from "@v1/components/ui/textarea";
import { MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  athleteId: string;
}

export default function CoachNoteForm({ athleteId }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!note.trim() || !user) return;
      await supabase.from("coach_timeline" as any).insert({
        athlete_id: athleteId,
        coach_id: user.id,
        tenant_id: tenantId,
        event_type: "note",
        title: "Observação do Coach",
        description: note.trim().slice(0, 500),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-timeline", athleteId] });
      toast.success("Observação registrada!");
      setNote("");
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Adicionar Observação
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Nova Observação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Observação sobre o atleta..."
          rows={3}
          maxLength={500}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => mutation.mutate()} disabled={!note.trim() || mutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" /> {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
