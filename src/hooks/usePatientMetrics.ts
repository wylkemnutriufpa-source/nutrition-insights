import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface PatientMetrics {
  weight: number | null;
  height: number | null;
  gender: "male" | "female" | null;
  source: string | null;
}

export function usePatientMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PatientMetrics>({ weight: null, height: null, gender: null, source: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetch() {
      let weight: number | null = null;
      let height: number | null = null;
      let gender: "male" | "female" | null = null;
      let source: string | null = null;

      // 1. Latest physical assessment
      const { data: assessment } = await (supabase as any)
        .from("physical_assessments")
        .select("weight, height")
        .eq("patient_id", user!.id)
        .order("assessment_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessment?.weight) {
        weight = assessment.weight;
        source = "avaliação física";
        if (assessment.height) height = assessment.height;
      }

      // 2. Latest check-in weight (may be more recent)
      const { data: checkin } = await supabase
        .from("patient_checkins")
        .select("weight")
        .eq("patient_id", user!.id)
        .not("weight", "is", null)
        .order("checkin_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkin?.weight) {
        weight = checkin.weight;
        source = "check-in";
      }

      // 3. Anamnesis data (weight, height, gender)
      const { data: anamnesis } = await supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesis?.answers) {
        const a = anamnesis.answers as any;
        if (!weight && a.weight) { weight = parseFloat(a.weight); source = "anamnese"; }
        if (!height && a.height) {
          let h = parseFloat(a.height);
          if (h > 0 && h < 3) h = h * 100;
          height = h;
        }
        if (!gender && a.gender) {
          gender = a.gender === "female" || a.gender === "feminino" ? "female" : "male";
        }
        if (!gender && a.sex) {
          gender = a.sex === "female" || a.sex === "feminino" ? "female" : "male";
        }
      }

      setMetrics({ weight, height, gender, source });
      setLoading(false);
    }

    fetch();
  }, [user]);

  return { ...metrics, loading };
}
