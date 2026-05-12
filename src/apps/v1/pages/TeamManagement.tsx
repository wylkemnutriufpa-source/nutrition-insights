import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";
import { useCanUseTeamHierarchy } from "@/hooks/useTeamMembers";
import TeamMembersList from "@/components/team/TeamMembersList";
import TeamActivityFeed from "@/components/team/TeamActivityFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TeamManagement() {
  const { canUse, maxMembers, tier } = useCanUseTeamHierarchy();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <SubscriptionGuard requiredTier="premium" featureName="Equipe Clínica">
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Equipe Clínica
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie funcionários, permissões e atribuições de pacientes
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Crown className="w-3.5 h-3.5 text-warning" />
              <span>Plano {tier} — até {maxMembers} membros</span>
            </div>
          </div>

          <Tabs defaultValue="members" className="space-y-4">
            <TabsList>
              <TabsTrigger value="members" className="gap-2">
                <Users className="w-4 h-4" /> Membros
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="w-4 h-4" /> Atividade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <TeamMembersList maxMembers={maxMembers} />
            </TabsContent>

            <TabsContent value="activity">
              <TeamActivityFeed />
            </TabsContent>
          </Tabs>
        </div>
      </SubscriptionGuard>
    </DashboardLayout>
  );
}
