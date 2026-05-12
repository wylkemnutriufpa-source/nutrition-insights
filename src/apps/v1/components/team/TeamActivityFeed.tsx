import { useTeamActivity } from "@v1/hooks/useTeamMembers";
import { Card, CardContent } from "@v1/components/ui/card";
import { Activity, UserPlus, Shield, Users, FileText, MessageSquare } from "lucide-react";
import { Skeleton } from "@v1/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_MAP: Record<string, { icon: any; label: string; color: string }> = {
  member_added: { icon: UserPlus, label: "Membro adicionado", color: "text-green-500" },
  member_removed: { icon: Users, label: "Membro removido", color: "text-destructive" },
  permission_changed: { icon: Shield, label: "Permissão alterada", color: "text-warning" },
  patient_assigned: { icon: Users, label: "Paciente atribuído", color: "text-primary" },
  plan_edited: { icon: FileText, label: "Plano editado", color: "text-blue-500" },
  feedback_responded: { icon: MessageSquare, label: "Feedback respondido", color: "text-purple-500" },
};

export default function TeamActivityFeed() {
  const { data: activities, isLoading } = useTeamActivity(50);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma atividade registrada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((act: any) => {
        const info = ACTION_MAP[act.action] || { icon: Activity, label: act.action, color: "text-muted-foreground" };
        const Icon = info.icon;
        return (
          <Card key={act.id} className="hover:bg-muted/30 transition-colors">
            <CardContent className="py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${info.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{info.label}</p>
                {act.metadata?.email && (
                  <p className="text-[10px] text-muted-foreground">{act.metadata.email}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {format(new Date(act.created_at), "dd MMM HH:mm", { locale: ptBR })}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
