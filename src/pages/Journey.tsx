import { useRef } from "react";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import ShareProgressButton from "@/components/social/ShareProgressButton";
import JourneyPhases from "@/components/gamification/JourneyPhases";
import BeforeAfterReport from "@/components/social/BeforeAfterReport";
import { JourneyTimelineFeed } from "@/components/gamification/JourneyTimelineFeed";
import { MomentumIndicator } from "@/components/gamification/MomentumIndicator";
import { PremiumBadge, PremiumAccentLine, PremiumMessage, PremiumCardWrapper } from "@/components/premium";

export default function Journey() {
  const { user } = useAuth();
  const shareRef = useRef<HTMLDivElement>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={shareRef}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Minha Jornada</h1>
              <p className="text-sm text-muted-foreground">Seu progresso ao longo do tempo</p>
            </div>
          </div>
          <ShareProgressButton captureRef={shareRef} context="journey" />
        </div>

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
