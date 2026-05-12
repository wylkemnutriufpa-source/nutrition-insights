import { useState } from "react";
import { useTeamMembers, TeamMemberWithPermissions } from "@/hooks/useTeamMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Shield, Users, Trash2, ToggleLeft, ToggleRight, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TeamMemberPermissionEditor from "./TeamMemberPermissionEditor";
import TeamPatientAssignmentModal from "./TeamPatientAssignmentModal";

interface Props {
  maxMembers: number;
}

export default function TeamMembersList({ maxMembers }: Props) {
  const { members, isLoading, addMember, toggleStatus, removeMember } = useTeamMembers();
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editPermsFor, setEditPermsFor] = useState<TeamMemberWithPermissions | null>(null);
  const [assignFor, setAssignFor] = useState<TeamMemberWithPermissions | null>(null);

  const activeCount = members.filter((m) => m.status === "active").length;
  const canAdd = activeCount < maxMembers;

  const handleAdd = async () => {
    if (!addEmail.trim()) return;
    await addMember.mutateAsync({ email: addEmail.trim(), displayName: addName.trim() || undefined });
    setAddEmail("");
    setAddName("");
    setAddOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add member button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeCount} / {maxMembers} membros ativos
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canAdd} className="gap-2">
              <UserPlus className="w-4 h-4" /> Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Funcionário à Equipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>E-mail do funcionário</Label>
                <Input
                  placeholder="email@exemplo.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome de exibição (opcional)</Label>
                <Input
                  placeholder="Nome do funcionário"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O funcionário precisa ter uma conta existente na plataforma.
                Permissões sensíveis estarão desabilitadas por padrão.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleAdd} disabled={addMember.isPending || !addEmail.trim()}>
                {addMember.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!canAdd && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-3 flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-warning" />
            Limite de membros atingido. Faça upgrade do plano para adicionar mais.
          </CardContent>
        </Card>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum funcionário na equipe ainda.</p>
            <p className="text-xs mt-1">Adicione funcionários para delegar tarefas clínicas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id} className={`transition-all ${member.status !== "active" ? "opacity-60" : ""}`}>
              <CardContent className="py-4 flex items-center gap-4 flex-wrap">
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(member.display_name || member.profile?.full_name || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {member.display_name || member.profile?.full_name || "Funcionário"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {member.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {member.assignedPatientCount > 0
                        ? `${member.assignedPatientCount} pacientes atribuídos`
                        : "Sem atribuição específica"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline" size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setEditPermsFor(member)}
                  >
                    <Shield className="w-3.5 h-3.5" /> Permissões
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setAssignFor(member)}
                  >
                    <Users className="w-3.5 h-3.5" /> Pacientes
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleStatus.mutate({
                      memberId: member.id,
                      newStatus: member.status === "active" ? "inactive" : "active",
                    })}
                    title={member.status === "active" ? "Desativar" : "Ativar"}
                  >
                    {member.status === "active"
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá {member.display_name || "este funcionário"} da equipe,
                          incluindo todas as permissões e atribuições de pacientes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMember.mutate(member.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permission Editor Modal */}
      {editPermsFor && (
        <TeamMemberPermissionEditor
          member={editPermsFor}
          open={!!editPermsFor}
          onOpenChange={(open) => !open && setEditPermsFor(null)}
        />
      )}

      {/* Patient Assignment Modal */}
      {assignFor && (
        <TeamPatientAssignmentModal
          member={assignFor}
          open={!!assignFor}
          onOpenChange={(open) => !open && setAssignFor(null)}
        />
      )}
    </div>
  );
}
