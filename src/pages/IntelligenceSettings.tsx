import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";
import IntelligenceSettingsPanel from "@/components/intelligence/IntelligenceSettingsPanel";

export default function IntelligenceSettings() {
  return (
    <DashboardLayout>
      <SubscriptionGuard featureName="Inteligência FitJourney" requiredTier="profissional">
        <IntelligenceSettingsPanel />
      </SubscriptionGuard>
    </DashboardLayout>
  );
}
