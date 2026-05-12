import { useState } from "react";
import { TeamMemberWithPermissions, useTeamPatientAssignments } from "@/hooks/useTeamMembers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, X, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  member: TeamMemberWithPermissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamPatientAssignmentModal({ member, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { assignments, isLoading, assignPatient, unassignPatient } = useTeamPatientAssignments(member.id);
  const [search, setSearch] = useState("");

  // Get all patients of the head professional
  const patientsQuery = useQuery({
    queryKey: ["head-patients-for-assignment", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: npData } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");
      if (!npData?.length) return [];
      const patientIds = npData.map((p: any) => p.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", patientIds);
      return profiles || [];
    },
    enabled: open && !!user,
  });

  const patients = patientsQuery.data || [];
  const assignedIds = new Set(assignments.map((a: any) => a.patient_id));

  const filteredPatients = patients.filter((p: any) =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Pacientes — {member.display_name || member.profile?.full_name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          {assignments.length === 0
            ? "Sem atribuição específica — funcionário pode ver todos os pacientes (respeitando permissões)."
            : `${assignments.length} pacientes atribuídos — funcionário vê apenas estes pacientes.`}
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Patient list */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {patientsQuery.isLoading || isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
          ) : (
            filteredPatients.map((patient: any) => {
              const isAssigned = assignedIds.has(patient.user_id);
              const assignment = assignments.find((a: any) => a.patient_id === patient.user_id);
              return (
                <div
                  key={patient.user_id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                    isAssigned ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {(patient.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">{patient.full_name || "Paciente"}</span>
                    {isAssigned && <Badge className="text-[9px]">Atribuído</Badge>}
                  </div>
                  {isAssigned ? (
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-destructive hover:text-destructive h-7"
                      onClick={() => assignment && unassignPatient.mutate(assignment.id)}
                      disabled={unassignPatient.isPending}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => assignPatient.mutate({ teamMemberId: member.id, patientId: patient.user_id })}
                      disabled={assignPatient.isPending}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Atribuir
                    </Button>
                  )}
                </div>
              );
            })
          )}
          {filteredPatients.length === 0 && !patientsQuery.isLoading && (
            <p className="text-center text-sm text-muted-foreground py-6">Nenhum paciente encontrado.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
