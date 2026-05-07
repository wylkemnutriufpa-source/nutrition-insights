import { useRef } from "react";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import ShareProgressButton from "@/components/social/ShareProgressButton";
// JourneyPhases removed
import BeforeAfterReport from "@/components/social/BeforeAfterReport";
import { JourneyTimelineFeed } from "@/components/gamification/JourneyTimelineFeed";
import { MomentumIndicator } from "@/components/gamification/MomentumIndicator";
import { PremiumBadge, PremiumAccentLine, PremiumMessage, PremiumCardWrapper } from "@/components/premium";
import ExpandableMealPlanCard from "@/components/patient/ExpandableMealPlanCard";

export default function Journey() {
  const { user } = useAuth();
  const shareRef = useRef<HTMLDivElement>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={shareRef}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PremiumCardWrapper className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </PremiumCardWrapper>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold">Minha Jornada</h1>
                <PremiumBadge />
              </div>
              <PremiumAccentLine />
              <p className="text-sm text-muted-foreground">Seu progresso ao longo do tempo</p>
              <PremiumMessage className="mt-0.5" />
            </div>
          </div>
          <ShareProgressButton captureRef={shareRef} context="journey" />
        </div>

        {/* Expandable Meal Plan - first thing patient sees */}
        <ExpandableMealPlanCard />

        {/* Momentum Indicator */}
        <MomentumIndicator variant="card" />

        {/* Journey Phases */}
        <JourneyPhases />

        {/* Before/After Report */}
        <BeforeAfterReport />

        {/* Full Journey Timeline */}
        <JourneyTimelineFeed maxEvents={100} showFilters title="Sua Jornada de Transformação" />
      </div>
    </DashboardLayout>
  );
}
