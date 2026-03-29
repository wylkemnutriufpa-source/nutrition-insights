import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import CoachDashboard from "@/components/coach-bodybuilder/CoachDashboard";
import AthleteDetailView from "@/components/coach-bodybuilder/AthleteDetailView";

export default function CoachBodybuilder() {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        {selectedAthleteId ? (
          <AthleteDetailView
            athleteId={selectedAthleteId}
            onBack={() => setSelectedAthleteId(null)}
          />
        ) : (
          <CoachDashboard onSelectAthlete={setSelectedAthleteId} />
        )}
      </div>
    </MainLayout>
  );
}
