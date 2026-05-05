import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { TeamPermissions } from "./useTeamMembers";

/**
 * Maps menu item routes to required team permissions.
 * If a route isn't listed here, it's visible by default (subject to role_visibility).
 */
const ROUTE_PERMISSION_MAP: Record<string, keyof TeamPermissions> = {
  "/patients": "can_view_patients",
  "/patient/": "can_view_patient_details",
  "/plano-alimentar": "can_view_meal_plans",
  "/editor-v2": "can_edit_meal_plans",
  "/onboarding": "can_view_pending_plans",
  "/onboarding-pipeline": "can_view_pending_plans",
  "/checkin": "can_view_checkins",
  "/chat": "can_respond_feedback",
  "/timeline": "can_view_timeline",
  "/projecao-corporal": "can_view_projection",
  "/alertas-clinicos": "can_view_clinical_risk",
  "/clinical-risk-dashboard": "can_view_clinical_risk",
  "/ranking": "can_access_ranking",
  "/relatorios": "can_access_reports",
  "/analytics": "can_access_reports",
  "/financeiro": "can_access_financial",
  "/automacoes": "can_manage_automation",
  "/team": "can_manage_team",
};

/**
 * Fetches permissions for the current user if they're an employee_clinical.
 * Returns a filter function that hides menu items the employee can't access.
 */
export function useTeamPermissionsFilter() {
  const { user, roles } = useAuth();

  const isEmployee = useMemo(
    () => (roles as string[]).includes("employee_clinical"),
    [roles]
  );

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["team-permissions", user?.id],
    enabled: !!user && isEmployee,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Find this user's team_member record
      const { data: member } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!member) return null;

      const { data: perms } = await supabase
        .from("team_member_permissions")
        .select("*")
        .eq("team_member_id", member.id)
        .limit(1)
        .single();

      return perms as TeamPermissions | null;
    },
  });

  /**
   * Returns true if the given route is allowed for the current user.
   * Non-employees always get true.
   */
  const isRouteAllowed = useMemo(() => {
    if (!isEmployee || !permissions) {
      const allowed = !isEmployee;
      console.log(`[DEBUG] useTeamPermissionsFilter isRouteAllowed (lazy check) | isEmployee: ${isEmployee} | permissionsLoaded: ${!!permissions} | result: ${allowed}`);
      return (_route: string) => !isEmployee;
    }

    return (route: string) => {
      console.log(`[DEBUG] useTeamPermissionsFilter checking route: ${route}`);
      // Check all route patterns
      for (const [routePattern, permKey] of Object.entries(ROUTE_PERMISSION_MAP)) {
        if (route === routePattern || route.startsWith(routePattern)) {
          const allowed = permissions[permKey] === true;
          console.log(`[DEBUG] useTeamPermissionsFilter result for ${route} (pattern: ${routePattern}): ${allowed}`);
          return allowed;
        }
      }
      // Routes not in the map are allowed by default
      console.log(`[DEBUG] useTeamPermissionsFilter result for ${route} (no pattern): true`);
      return true;
    };
  }, [isEmployee, permissions]);

  /**
   * Filter an array of menu items by permissions
   */
  const filterMenuItems = useMemo(() => {
    return <T extends { route: string }>(items: T[]): T[] => {
      if (!isEmployee) return items;
      return items.filter((item) => isRouteAllowed(item.route));
    };
  }, [isEmployee, isRouteAllowed]);

  return {
    isEmployee,
    permissions,
    isLoading,
    isRouteAllowed,
    filterMenuItems,
  };
}
