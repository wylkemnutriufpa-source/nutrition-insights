import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface ProfessionalModules {
  coachBodybuilderEnabled: boolean;
  personalTrainerEnabled: boolean;
  loading: boolean;
}

export function useProfessionalModules(): ProfessionalModules {
  const { user, isNutritionist, isPersonal, isAdmin } = useAuth();
  const [modules, setModules] = useState<ProfessionalModules>({
    coachBodybuilderEnabled: false,
    personalTrainerEnabled: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setModules({ coachBodybuilderEnabled: false, personalTrainerEnabled: false, loading: false });
      return;
    }

    // Admins always have access, but we'll respect the user's wish to leave personal for later
    if (isAdmin) {
      setModules({ 
        coachBodybuilderEnabled: true, 
        personalTrainerEnabled: false, // Disabled as requested for focus on Nutritionist
        loading: false 
      });
      return;
    }

    if (!isNutritionist && !isPersonal) {
      setModules({ coachBodybuilderEnabled: false, personalTrainerEnabled: false, loading: false });
      return;
    }

    supabase
      .from("professional_profiles")
      .select("coach_bodybuilder_enabled, personal_trainer_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setModules({
          coachBodybuilderEnabled: data?.coach_bodybuilder_enabled ?? false,
          personalTrainerEnabled: data?.personal_trainer_enabled ?? false,
          loading: false,
        });
      });
  }, [user, isAdmin, isNutritionist, isPersonal]);

  return modules;
}
