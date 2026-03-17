import { useState, useCallback } from "react";

export type ViewMode = "grid" | "list";
export type ProViewMode = "clinical-list" | "strategic-dashboard";

const PATIENT_VIEW_KEY = "fj_patient_view_mode";
const PRO_VIEW_KEY = "fj_pro_view_mode";
const SIDEBAR_GROUPS_KEY = "fj_sidebar_open_groups";

export function useLayoutPreference() {
  const [patientView, setPatientViewState] = useState<ViewMode>(
    () => (localStorage.getItem(PATIENT_VIEW_KEY) as ViewMode) || "grid"
  );
  const [proView, setProViewState] = useState<ProViewMode>(
    () => (localStorage.getItem(PRO_VIEW_KEY) as ProViewMode) || "clinical-list"
  );

  const setPatientView = useCallback((mode: ViewMode) => {
    setPatientViewState(mode);
    localStorage.setItem(PATIENT_VIEW_KEY, mode);
  }, []);

  const setProView = useCallback((mode: ProViewMode) => {
    setProViewState(mode);
    localStorage.setItem(PRO_VIEW_KEY, mode);
  }, []);

  return { patientView, setPatientView, proView, setProView };
}

export function useSidebarGroups() {
  const [openGroups, setOpenGroupsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUPS_KEY);
      return saved ? JSON.parse(saved) : ["CLÍNICO"];
    } catch {
      return ["CLÍNICO"];
    }
  });

  const toggleGroup = useCallback((group: string) => {
    setOpenGroupsState((prev) => {
      const next = prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group];
      localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { openGroups, toggleGroup };
}
