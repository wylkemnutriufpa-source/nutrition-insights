import { useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const STORAGE_KEY = "fj_active_patient_id";

/**
 * Tracks the "active patient" the professional is currently working with.
 * Used to power contextual back-navigation: when the user clicks "Voltar"
 * from any patient sub-flow (plan, anamnesis, in-office, etc.), they return
 * to the patient profile (`/patients/:id`) — NOT the global patient list.
 */
export function usePatientContext() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Capture the patient id when navigating into /patients/:patientId or /in-office/:patientId
  useEffect(() => {
    const segs = location.pathname.split("/").filter(Boolean);
    if (segs[0] === "patients" && segs[1] && segs[1] !== "import") {
      try {
        localStorage.setItem(STORAGE_KEY, segs[1]);
      } catch {}
    }
    if (segs[0] === "in-office" && segs[1]) {
      try {
        localStorage.setItem(STORAGE_KEY, segs[1]);
      } catch {}
    }
  }, [location.pathname]);

  const getActivePatientId = useCallback((): string | null => {
    if (params.patientId) return params.patientId as string;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, [params.patientId]);

  /**
   * Smart back: returns to the active patient profile if any, otherwise to fallback.
   */
  const goBackContextual = useCallback(
    (fallback = "/dashboard") => {
      const id = getActivePatientId();
      if (id) {
        navigate(`/patients/${id}`);
      } else {
        navigate(fallback);
      }
    },
    [getActivePatientId, navigate]
  );

  const clearPatientContext = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { getActivePatientId, goBackContextual, clearPatientContext };
}
