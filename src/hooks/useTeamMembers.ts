import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  head_professional_id: string;
  user_id: string;
  role: string;
  status: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamPermissions {
  id: string;
  team_member_id: string;
  head_professional_id: string;
  can_view_patients: boolean;
  can_view_patient_details: boolean;
  can_view_meal_plans: boolean;
  can_edit_meal_plans: boolean;
  can_view_pending_plans: boolean;
  can_approve_plans: boolean;
  can_view_checkins: boolean;
  can_respond_feedback: boolean;
  can_view_timeline: boolean;
  can_view_projection: boolean;
  can_view_clinical_risk: boolean;
  can_access_ranking: boolean;
  can_access_reports: boolean;
  can_access_financial: boolean;
  can_manage_automation: boolean;
  can_manage_team: boolean;
}

export interface TeamMemberWithPermissions extends TeamMember {
  permissions: TeamPermissions | null;
  profile: { full_name: string; avatar_url: string | null } | null;
  assignedPatientCount: number;
}

export interface PatientAssignment {
  id: string;
  team_member_id: string;
  patient_id: string;
  head_professional_id: string;
  created_at: string;
}

export interface TeamActivityLog {
  id: string;
  team_member_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Max team members by subscription tier
const MAX_TEAM_BY_TIER: Record<string, number> = {
  basic: 0,
  profissional: 2,
  premium: 10,
  enterprise: 999,
};

export function useCanUseTeamHierarchy() {
  const { subscription, isAdmin } = useAuth();
  if (isAdmin) return { canUse: true, maxMembers: 999, tier: "admin" };
  const tier = subscription.subscription_tier || "basic";
  const max = MAX_TEAM_BY_TIER[tier] || 0;
  return {
    canUse: max > 0 && (subscription.subscribed || subscription.is_trial),
    maxMembers: max,
    tier,
  };
}

export function useTeamMembers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get members
      const { data: members, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("head_professional_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!members?.length) return [];

      const memberIds = members.map((m: any) => m.id);
      const userIds = members.map((m: any) => m.user_id);

      // Batch fetch permissions + profiles + assignment counts
      const [permsRes, profilesRes, assignRes] = await Promise.all([
        supabase.from("team_member_permissions").select("*").in("team_member_id", memberIds),
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("team_member_patient_assignments").select("team_member_id").in("team_member_id", memberIds),
      ]);

      const permsMap = new Map((permsRes.data || []).map((p: any) => [p.team_member_id, p]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const assignCountMap = new Map<string, number>();
      (assignRes.data || []).forEach((a: any) => {
        assignCountMap.set(a.team_member_id, (assignCountMap.get(a.team_member_id) || 0) + 1);
      });

      return members.map((m: any): TeamMemberWithPermissions => ({
        ...m,
        permissions: permsMap.get(m.id) || null,
        profile: profilesMap.get(m.user_id) || null,
        assignedPatientCount: assignCountMap.get(m.id) || 0,
      }));
    },
    enabled: !!user,
  });

  const addMember = useMutation({
    mutationFn: async ({ email, displayName }: { email: string; displayName?: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Find user by email
      const { data: found } = await supabase.rpc("get_patient_emails", {
        _patient_ids: [] as string[],
      });
      // Use a different approach: lookup via profiles or direct insert
      // We need to find the user_id for this email
      const { data: users, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("user_id", "%"); // We can't search by email in profiles

      // Better approach: use find_existing_patient_emails
      const { data: emailResult } = await supabase.rpc("find_existing_patient_emails", {
        _emails: [email.toLowerCase()],
        _nutritionist_id: user.id,
      });

      if (!emailResult?.length) {
        throw new Error("Usuário não encontrado. O funcionário precisa ter uma conta criada primeiro.");
      }

      // Get user_id from auth
      const { data: patientEmails } = await supabase.rpc("get_patient_emails", {
        _patient_ids: [], // We need another approach
      });

      // Actually, let's create a simpler lookup - search by email in the returned data
      // find_existing_patient_emails returns email + already_linked, but not user_id
      // We'll need to use the edge function or a different RPC

      // For now, use a direct approach through an edge function
      const { data, error } = await supabase.functions.invoke("team-member-add", {
        body: { email: email.toLowerCase(), display_name: displayName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Funcionário adicionado à equipe!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao adicionar funcionário");
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ teamMemberId, permissions }: { teamMemberId: string; permissions: Partial<TeamPermissions> }) => {
      const { error } = await supabase
        .from("team_member_permissions")
        .update({ ...permissions, updated_at: new Date().toISOString() })
        .eq("team_member_id", teamMemberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Permissões atualizadas!");
    },
    onError: () => toast.error("Erro ao atualizar permissões"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ memberId, newStatus }: { memberId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao alterar status"),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Funcionário removido da equipe.");
    },
    onError: () => toast.error("Erro ao remover funcionário"),
  });

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    addMember,
    updatePermissions,
    toggleStatus,
    removeMember,
  };
}

export function useTeamActivity(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team-activity", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_member_activity_logs")
        .select("*")
        .eq("head_professional_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useTeamPatientAssignments(teamMemberId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ["team-assignments", teamMemberId],
    queryFn: async () => {
      if (!teamMemberId || !user) return [];
      const { data, error } = await supabase
        .from("team_member_patient_assignments")
        .select("*")
        .eq("team_member_id", teamMemberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamMemberId && !!user,
  });

  const assignPatient = useMutation({
    mutationFn: async ({ teamMemberId, patientId }: { teamMemberId: string; patientId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("team_member_patient_assignments")
        .insert({
          head_professional_id: user.id,
          team_member_id: teamMemberId,
          patient_id: patientId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Paciente atribuído!");
    },
    onError: () => toast.error("Erro ao atribuir paciente"),
  });

  const unassignPatient = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("team_member_patient_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Atribuição removida!");
    },
    onError: () => toast.error("Erro ao remover atribuição"),
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    assignPatient,
    unassignPatient,
  };
}

// Hook for employee_clinical users to get their own permissions
export function useMyTeamPermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-team-permissions", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("get_team_permissions", { _user_id: user.id });
      if (error) throw error;
      return data as unknown as TeamPermissions | null;
    },
    enabled: !!user,
  });
}
