import { useState } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import CoachDashboard from "@v1/components/coach-bodybuilder/CoachDashboard";
import AthleteDetailView from "@v1/components/coach-bodybuilder/AthleteDetailView";

export default function CoachBodybuilder() {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  );
}
