import DashboardLayout from "@v1/components/layout/DashboardLayout";
import SubscriptionGuard from "@v1/components/common/SubscriptionGuard";
import IntelligenceSettingsPanel from "@v1/components/intelligence/IntelligenceSettingsPanel";

export default function IntelligenceSettings() {
  return (
    <DashboardLayout>
      <SubscriptionGuard featureName="Inteligência FitJourney" requiredTier="profissional">
        <IntelligenceSettingsPanel />
      </SubscriptionGuard>
    </DashboardLayout>
  );
}
