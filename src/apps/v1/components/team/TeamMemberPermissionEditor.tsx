import { useTeamMembers, TeamMemberWithPermissions, TeamPermissions } from "@/hooks/useTeamMembers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield } from "lucide-react";

interface Props {
  member: TeamMemberWithPermissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PermGroup {
  label: string;
  items: { key: keyof TeamPermissions; label: string; sensitive?: boolean; description?: string }[];
}

const PERM_GROUPS: PermGroup[] = [
  {
    label: "Pacientes",
    items: [
      { key: "can_view_patients", label: "Ver lista de pacientes" },
      { key: "can_view_patient_details", label: "Ver detalhes do paciente" },
      { key: "can_view_timeline", label: "Ver timeline clínica" },
      { key: "can_view_checkins", label: "Ver check-ins" },
      { key: "can_view_projection", label: "Ver projeção corporal" },
    ],
  },
  {
    label: "Planos Alimentares",
    items: [
      { key: "can_view_meal_plans", label: "Ver planos alimentares" },
      { key: "can_view_pending_plans", label: "Ver planos pendentes" },
      { key: "can_edit_meal_plans", label: "Editar planos alimentares" },
      { key: "can_approve_plans", label: "Aprovar planos", sensitive: true, description: "Permite publicar planos para pacientes" },
    ],
  },
  {
    label: "Interações",
    items: [
      { key: "can_respond_feedback", label: "Responder feedbacks" },
    ],
  },
  {
    label: "Módulos Avançados",
    items: [
      { key: "can_view_clinical_risk", label: "Ver risco clínico", sensitive: true },
      { key: "can_access_ranking", label: "Acessar ranking" },
      { key: "can_access_reports", label: "Acessar relatórios" },
    ],
  },
  {
    label: "Administração",
    items: [
      { key: "can_access_financial", label: "Acesso financeiro", sensitive: true, description: "⚠️ Permite ver dados financeiros" },
      { key: "can_manage_automation", label: "Gerenciar automações", sensitive: true },
      { key: "can_manage_team", label: "Gerenciar equipe", sensitive: true, description: "⚠️ Permite adicionar/remover membros" },
    ],
  },
];

export default function TeamMemberPermissionEditor({ member, open, onOpenChange }: Props) {
  const { updatePermissions } = useTeamMembers();
  const perms = member.permissions;

  const handleToggle = (key: keyof TeamPermissions, value: boolean) => {
    updatePermissions.mutate({
      teamMemberId: member.id,
      permissions: { [key]: value } as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Permissões — {member.display_name || member.profile?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {PERM_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
                {group.label}
              </h4>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const val = perms ? (perms as any)[item.key] ?? false : false;
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <Label className="text-sm flex items-center gap-1.5 cursor-pointer">
                          {item.label}
                          {item.sensitive && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-warning/50 text-warning">
                              Sensível
                            </Badge>
                          )}
                        </Label>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={val}
                        onCheckedChange={(checked) => handleToggle(item.key, checked)}
                        disabled={updatePermissions.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Permissões sensíveis (financeiro, equipe, risco clínico) são desabilitadas por padrão.
              Conceda apenas o necessário para a função do colaborador.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
