import LandingHero from "@/components/landing/LandingHero";
import LandingSocialProof from "@/components/landing/LandingSocialProof";
import LandingProductDemo from "@/components/landing/LandingProductDemo";
import LandingAIEngine from "@/components/landing/LandingAIEngine";
import LandingGamification from "@/components/landing/LandingGamification";
import LandingCoachSection from "@/components/landing/LandingCoachSection";
import LandingIntegrations from "@/components/landing/LandingIntegrations";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";

export default function GatewayPage() {
  return (
    <div className="min-h-screen mesh-gradient-bg">
      <LandingHero />
      <LandingSocialProof />
      <LandingProductDemo />
      <LandingAIEngine />
      <LandingGamification />
      <LandingCoachSection />
      <LandingIntegrations />
      <LandingFAQ />
      <LandingFinalCTA />
    </div>
  );
}
