import DashboardLayout from "@/components/layout/DashboardLayout";
import ClinicalRiskDashboardContent from "@/components/dashboard/ClinicalRiskDashboardContent";

export default function ClinicalRiskDashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <ClinicalRiskDashboardContent />
      </div>
    </DashboardLayout>
  );
}
