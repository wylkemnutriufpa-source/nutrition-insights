import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";
import type { PrestigePlan } from "@/hooks/usePrestige";

export interface PatientInfo {
  id: string;
  patient_id: string;
  status: string;
  journey_status?: string;
  notes: string | null;
  created_at: string;
  expires_at?: string | null;
  email?: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
  priorityScore?: number;
  stats?: { last_meal_date?: string; total_xp?: number; current_streak?: number } | null;
  checklistAdherence?: number;
  programs?: { id: string; title: string }[];
  prestigePlan?: PrestigePlan | null;
  requires_medical_review?: boolean;
}

export interface ProgramInfo {
  id: string;
  title: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
}

export interface PatientsListResult {
  patients: PatientInfo[];
  programs: ProgramInfo[];
  prestigePlans: PrestigePlan[];
  pagination: PaginationState;
  counts: { active: number; inactive: number };
}

const isInactiveStatus = (status: string | null | undefined) => status === "inactive";

function computeScore(stats: any, checklistData: any): number {
  let score = 0;
  if (checklistData) {
    const total = checklistData.total || 0;
    const completed = checklistData.completed || 0;
    score += total > 0 ? Math.round((completed / total) * 40) : 20;
  }
  if (stats?.last_meal_date) {
    const daysSince = Math.floor((Date.now() - new Date(stats.last_meal_date).getTime()) / 86400000);
    score += daysSince <= 1 ? 20 : daysSince <= 3 ? 15 : daysSince <= 7 ? 10 : 5;
  }
  if (stats?.total_xp) {
    score += stats.total_xp > 500 ? 20 : stats.total_xp > 100 ? 15 : 10;
  }
  if (stats?.current_streak !== undefined) {
    score += stats.current_streak >= 7 ? 20 : stats.current_streak >= 3 ? 15 : stats.current_streak >= 1 ? 10 : 5;
  }
  return Math.min(100, Math.max(0, score));
}

// Recent patients tracking
const RECENT_KEY = "fitjourney_recent_patients";
const MAX_RECENT = 50;

function getRecentPatients(): Record<string, { count: number; lastSeen: number }> {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "{}"); } catch { return {}; }
}

export function trackPatientView(patientId: string) {
  const recent = getRecentPatients();
  const entry = recent[patientId] || { count: 0, lastSeen: 0 };
  entry.count += 1;
  entry.lastSeen = Date.now();
  recent[patientId] = entry;
  const sorted = Object.entries(recent).sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(Object.fromEntries(sorted)));
}

function getRecentScore(patientId: string): number {
  const recent = getRecentPatients();
  const entry = recent[patientId];
  if (!entry) return 0;
  const hoursSince = (Date.now() - entry.lastSeen) / 3600000;
  const recency = Math.max(0, 100 - hoursSince * 2);
  const frequency = Math.min(entry.count * 10, 50);
  return recency + frequency;
}

export { computeScore, getRecentScore };

export const DEFAULT_PAGE_SIZE = 250;

export interface PatientsListParams {
  page?: number;
  pageSize?: number;
  statusFilter?: "active" | "inactive" | "all";
  search?: string;
}

export function usePatientsList(params: PatientsListParams = {}) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const statusFilter = params.statusFilter ?? "all";
  const search = params.search ?? "";

  return useQuery<PatientsListResult>({
    queryKey: [...queryKeys.patients.all(user?.id ?? ""), page, pageSize, statusFilter, search, tenantId],
    enabled: !!user,
    staleTime: 10 * 1000, // 10s — fast refresh for lifecycle sync
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const userId = user!.id;
      const today = new Date().toISOString().split("T")[0];

      // 1. Get total counts by status (lightweight count queries)
      const [activeCountRes, inactiveCountRes] = await Promise.all([
        withTenantFilter(supabase.from("nutritionist_patients").select("id", { count: "exact", head: true })
          .eq("nutritionist_id", userId).neq("status", "inactive"), tenantId),
        withTenantFilter(supabase.from("nutritionist_patients").select("id", { count: "exact", head: true })
          .eq("nutritionist_id", userId).eq("status", "inactive"), tenantId),
      ]);

      const activeCount = activeCountRes.count || 0;
      const inactiveCount = inactiveCountRes.count || 0;

      // 2. Build the paginated query with filters
      let query = withTenantFilter(supabase
        .from("nutritionist_patients")
        .select("*", { count: "exact" })
        .eq("nutritionist_id", userId), tenantId)
        .order("created_at", { ascending: false });

       if (statusFilter === "active") query = query.neq("status", "inactive");
       else if (statusFilter === "inactive") query = query.eq("status", "inactive");

      // Server-side search: fetch matching profiles, then filter links
      let allData: any[] = [];
      let totalCount = 0;

      if (search.trim() && search.trim().length >= 2) {
        // Use server-side Full-Text Search via RPC for optimal performance
        const searchTerm = search.trim();
        
        const { data: searchResults } = await supabase.rpc("search_patients", {
          _nutritionist_id: userId,
          _query: searchTerm,
          _limit: 100,
        });

        if (!searchResults || searchResults.length === 0) {
          const { data: progs } = await supabase.from("programs")
            .select("id, title").eq("created_by", userId).eq("is_active", true);
          const { data: pPlans } = await supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order");
          return {
            patients: [],
            programs: (progs || []) as ProgramInfo[],
            prestigePlans: mapPrestigePlans(pPlans),
            pagination: { page, pageSize, totalCount: 0, hasNextPage: false, hasPreviousPage: false, totalPages: 0 },
            counts: { active: activeCount, inactive: inactiveCount },
          };
        }

        const matchingIds = new Set((searchResults as any[]).map((r: any) => r.user_id));

        // Fetch links for matched patients
        let linksQuery = supabase
          .from("nutritionist_patients")
          .select("*")
          .eq("nutritionist_id", userId)
          .in("patient_id", Array.from(matchingIds));
        if (statusFilter === "active") linksQuery = linksQuery.neq("status", "inactive");
        else if (statusFilter === "inactive") linksQuery = linksQuery.eq("status", "inactive");

        const { data: filteredLinks } = await linksQuery;
        totalCount = (filteredLinks || []).length;

        const start = (page - 1) * pageSize;
        allData = (filteredLinks || []).slice(start, start + pageSize);
      } else if (search.trim() && search.trim().length < 2) {
        // Less than 2 chars: skip search, return normal paginated results
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count } = await query.range(from, to);
        allData = data || [];
        totalCount = count || 0;
      } else {
        // No search: use proper server-side pagination with range
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count } = await query.range(from, to);
        allData = data || [];
        totalCount = count || 0;
      }

      if (allData.length === 0) {
        const { data: progs } = await supabase.from("programs")
          .select("id, title").eq("created_by", userId).eq("is_active", true);
        const { data: pPlans } = await supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order");
        return {
          patients: [],
          programs: (progs || []) as ProgramInfo[],
          prestigePlans: mapPrestigePlans(pPlans),
          pagination: {
            page, pageSize, totalCount,
            hasNextPage: page * pageSize < totalCount,
            hasPreviousPage: page > 1,
            totalPages: Math.ceil(totalCount / pageSize),
          },
          counts: { active: activeCount, inactive: inactiveCount },
        };
      }

      const patientIds = allData.map((p: any) => p.patient_id);

      // BATCH queries (7 parallel - player_stats removed)
      const [profilesRes, checklistRes, enrollmentsRes, prestigeRes, pPlansRes, emailsRes, progsRes, assessmentsRes] = await Promise.all([
        withTenantFilter(supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", patientIds), tenantId),
        withTenantFilter(supabase.from("checklist_tasks").select("patient_id, id, completed").in("patient_id", patientIds).eq("date", today), tenantId),
        supabase.from("program_patients")
          .select("patient_id, program_id, programs(id, title)")
          .eq("status", "active")
          .in("patient_id", patientIds),
        supabase.from("patient_prestige")
          .select("patient_id, plan_id, prestige_plans(*)")
          .eq("is_active", true)
          .in("patient_id", patientIds),
        supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
        supabase.rpc("get_patient_emails", { _patient_ids: patientIds }),
        supabase.from("programs").select("id, title").eq("created_by", userId).eq("is_active", true),
        supabase.from("trainer_assessments").select("patient_id, requires_medical_review").in("patient_id", patientIds),
      ]);

      // Build maps
      const emailMap = new Map<string, string>();
      ((emailsRes.data as any[]) || []).forEach((e: any) => emailMap.set(e.user_id, e.email));

      const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }));

      const statsMap = new Map<string, any>();

      const checklistMap = new Map<string, { total: number; completed: number }>();
      (checklistRes.data || []).forEach((t: any) => {
        const entry = checklistMap.get(t.patient_id) || { total: 0, completed: 0 };
        entry.total += 1;
        if (t.completed) entry.completed += 1;
        checklistMap.set(t.patient_id, entry);
      });

      const prestigeMap = new Map<string, PrestigePlan>();
      (prestigeRes.data || []).forEach((pp: any) => {
        if (pp.prestige_plans) {
          const d = pp.prestige_plans;
          prestigeMap.set(pp.patient_id, {
            id: d.id, name: d.name, slug: d.slug, display_order: d.display_order, color: d.color,
            badge_icon: d.badge_icon, badge_label: d.badge_label, crown_enabled: d.crown_enabled,
            effect_type: d.effect_type, ranking_highlight: d.ranking_highlight,
            ai_usage_multiplier: d.ai_usage_multiplier, features: d.features || [],
            price_monthly: d.price_monthly, price_quarterly: d.price_quarterly,
            price_semiannual: d.price_semiannual, price_annual: d.price_annual,
          });
        }
      });

      const enrollmentMap = new Map<string, { id: string; title: string }[]>();
      (enrollmentsRes.data || []).forEach((e: any) => {
        const list = enrollmentMap.get(e.patient_id) || [];
        if (e.programs) list.push({ id: e.programs.id, title: e.programs.title });
        enrollmentMap.set(e.patient_id, list);
      });
      
      const medicalReviewMap = new Map<string, boolean>();
      (assessmentsRes.data || []).forEach((a: any) => {
        if (a.requires_medical_review) medicalReviewMap.set(a.patient_id, true);
      });

      const enriched: PatientInfo[] = allData.map((p: any) => {
        const checkData = checklistMap.get(p.patient_id) || { total: 0, completed: 0 };
        const adherence = checkData.total > 0 ? Math.round((checkData.completed / checkData.total) * 100) : 0;
        const profile = profileMap.get(p.patient_id);
        const stats = statsMap.get(p.patient_id);
        return {
          ...p,
          email: emailMap.get(p.patient_id) || undefined,
          profile: profile && profile.full_name ? profile : { full_name: "Paciente sem nome", avatar_url: null },
          stats: stats || null,
          checklistAdherence: adherence,
          priorityScore: computeScore(stats, checkData),
          programs: enrollmentMap.get(p.patient_id) || [],
          prestigePlan: prestigeMap.get(p.patient_id) || null,
          requires_medical_review: medicalReviewMap.get(p.patient_id) || false,
        };
      });

      // Sort: recently viewed first, then by priority score
      enriched.sort((a, b) => {
        const recentA = getRecentScore(a.patient_id);
        const recentB = getRecentScore(b.patient_id);
        if (recentA > 10 || recentB > 10) {
          if (Math.abs(recentA - recentB) > 5) return recentB - recentA;
        }
        return (a.priorityScore || 0) - (b.priorityScore || 0);
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        patients: enriched,
        programs: (progsRes.data || []) as ProgramInfo[],
        prestigePlans: mapPrestigePlans(pPlansRes.data),
        pagination: {
          page,
          pageSize,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          totalPages,
        },
        counts: { active: activeCount, inactive: inactiveCount },
      };
    },
  });
}

function mapPrestigePlans(data: any[] | null): PrestigePlan[] {
  return (data || []).map((d: any) => ({
    id: d.id, name: d.name, slug: d.slug, display_order: d.display_order, color: d.color,
    badge_icon: d.badge_icon, badge_label: d.badge_label, crown_enabled: d.crown_enabled,
    effect_type: d.effect_type, ranking_highlight: d.ranking_highlight,
    ai_usage_multiplier: d.ai_usage_multiplier, features: d.features || [],
    price_monthly: d.price_monthly, price_quarterly: d.price_quarterly,
    price_semiannual: d.price_semiannual, price_annual: d.price_annual,
  }));
}

function updateCachedPatientsAfterStatusToggle(
  currentData: PatientsListResult | undefined,
  linkId: string,
  newStatus: "active" | "inactive",
  statusFilter: PatientsListParams["statusFilter"] = "all",
) {
  if (!currentData) return currentData;

  const previousPatient = currentData.patients.find((patient) => patient.id === linkId);
  if (!previousPatient) return currentData;

  const previousStatus = previousPatient.status;
  const nextPatients = currentData.patients
    .map((patient) => patient.id === linkId ? { ...patient, status: newStatus } : patient)
    .filter((patient) => {
      if (statusFilter === "active") return patient.status === "active";
      if (statusFilter === "inactive") return patient.status !== "active";
      return true;
    });

  const activeDelta = !isInactiveStatus(previousStatus) && isInactiveStatus(newStatus)
    ? -1
    : isInactiveStatus(previousStatus) && !isInactiveStatus(newStatus)
      ? 1
      : 0;

  const nextCounts = {
    active: Math.max(0, currentData.counts.active + activeDelta),
    inactive: Math.max(0, currentData.counts.inactive - activeDelta),
  };

  const nextTotalCount = Math.max(
    0,
    currentData.pagination.totalCount + (
      statusFilter === "active" && !isInactiveStatus(previousStatus) && isInactiveStatus(newStatus)
        ? -1
        : statusFilter === "inactive" && isInactiveStatus(previousStatus) && !isInactiveStatus(newStatus)
          ? -1
          : 0
    ),
  );

  const totalPages = nextTotalCount > 0 ? Math.ceil(nextTotalCount / currentData.pagination.pageSize) : 0;

  return {
    ...currentData,
    patients: nextPatients,
    counts: nextCounts,
    pagination: {
      ...currentData.pagination,
      totalCount: nextTotalCount,
      totalPages,
      hasNextPage: totalPages > 0 && currentData.pagination.page < totalPages,
      hasPreviousPage: currentData.pagination.page > 1,
    },
  };
}

export function useTogglePatientStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const patientQueryKey = queryKeys.patients.all(user?.id ?? "");

  return useMutation({
    mutationFn: async ({ linkId, currentStatus }: { linkId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("nutritionist_patients")
        .update({ status: newStatus })
        .eq("id", linkId);
      if (error) throw error;
      logAudit("toggle_patient_status", "patient", linkId, { new_status: newStatus });
      return newStatus;
    },
    onMutate: async ({ linkId, currentStatus }) => {
      const nextStatus = currentStatus === "active" ? "inactive" : "active";
      await queryClient.cancelQueries({ queryKey: patientQueryKey });

      const previousQueries = queryClient.getQueriesData<PatientsListResult>({ queryKey: patientQueryKey });

      previousQueries.forEach(([key, value]) => {
        const statusFilter = Array.isArray(key) ? key[4] as PatientsListParams["statusFilter"] | undefined : undefined;
        queryClient.setQueryData<PatientsListResult>(
          key,
          updateCachedPatientsAfterStatusToggle(value, linkId, nextStatus, statusFilter),
        );
      });

      return { previousQueries };
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: patientQueryKey });
      toast.success(
        newStatus === "active"
          ? "Paciente ativado — dados incluídos nas métricas"
          : "Paciente desativado — excluído das métricas e leituras de IA"
      );
    },
    onError: (err: any, _vars, context) => {
      context?.previousQueries?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patientQueryKey });
    },
  });
}

export function useAddPatient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ email, name, password }: { email: string; name: string; password: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: {
          name: trimmedName,
          email: normalizedEmail,
          method: "password",
          password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const patientId = data?.patient_id || data?.user_id;
      if (!patientId) {
        console.error("Mutation addPatient failed: missing patient_id in response", data);
        throw new Error("Erro crítico: Conta criada mas ID não retornado pelo servidor.");
      }

      logAudit("create_patient", "patient", patientId as string, { email: normalizedEmail, name: trimmedName });
      return patientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", user?.id ?? ""] });
      toast.success("Paciente cadastrado e vinculado! 🎉");
    },
    onError: (err: any) => toast.error("Erro: " + (err.message || "Tente novamente")),
  });
}

export function useRemoveFromProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, programId }: { patientId: string; programId: string }) => {
      const { error } = await supabase.from("program_patients")
        .delete()
        .eq("patient_id", patientId)
        .eq("program_id", programId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", user?.id ?? ""] });
    },
    onError: (err: any) => toast.error("Erro ao remover do programa"),
  });
}

export function useUpdateExpiry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ linkId, date }: { linkId: string; date: string | null }) => {
      const { error } = await supabase.from("nutritionist_patients")
        .update({ expires_at: date || null } as any)
        .eq("id", linkId);
      if (error) throw error;
      return date;
    },
    onSuccess: (date) => {
      queryClient.invalidateQueries({ queryKey: ["patients", user?.id ?? ""] });
      toast.success(date ? `Vencimento definido: ${new Date(date).toLocaleDateString("pt-BR")}` : "Vencimento removido");
    },
    onError: (err: any) => toast.error("Erro ao atualizar vencimento"),
  });
}

export function useBulkToggle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: "active" | "inactive" }) => {
      const { error } = await supabase.from("nutritionist_patients")
        .update({ status: newStatus })
        .in("id", ids);
      if (error) throw error;
      return { count: ids.length, newStatus };
    },
    onSuccess: ({ count, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["patients", user?.id ?? ""] });
      toast.success(`${count} pacientes ${newStatus === "active" ? "ativados" : "desativados"}`);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });
}

export function useAssignToProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, programId }: { patientId: string; programId: string }) => {
      const { error } = await supabase.from("program_patients").insert({
        program_id: programId,
        patient_id: patientId,
        status: "active",
      });
      if (error) {
        if (error.code === "23505") { toast.info("Paciente já está neste programa"); return; }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", user?.id ?? ""] });
      toast.success("Paciente adicionado ao programa!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}