import DashboardLayout from "@/components/layout/DashboardLayout";
import ClinicalRiskDashboardContent from "@/components/dashboard/ClinicalRiskDashboardContent";
import { PremiumCardWrapper } from "@/components/premium";

export default function ClinicalRiskDashboard() {
  return (
    <DashboardLayout>
      <PremiumCardWrapper className="max-w-7xl mx-auto p-4 md:p-6" enableShimmer>
        <ClinicalRiskDashboardContent />
      </PremiumCardWrapper>
    </DashboardLayout>
  );
}
