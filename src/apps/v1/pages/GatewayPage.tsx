import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingHero from "@v1/components/landing/LandingHero";
import LandingSocialProof from "@v1/components/landing/LandingSocialProof";
import LandingProductDemo from "@v1/components/landing/LandingProductDemo";
import LandingAIEngine from "@v1/components/landing/LandingAIEngine";
import LandingGamification from "@v1/components/landing/LandingGamification";
import LandingCoachSection from "@v1/components/landing/LandingCoachSection";
import LandingIntegrations from "@v1/components/landing/LandingIntegrations";
import LandingFAQ from "@v1/components/landing/LandingFAQ";
import LandingFinalCTA from "@v1/components/landing/LandingFinalCTA";
import CinematicIntro from "@v1/components/landing/CinematicIntro";
import InstitutionalFooter from "@v1/components/institutional/InstitutionalFooter";
import LandingTopNav from "@v1/components/landing/LandingTopNav";

const STORAGE_KEY = "fj_intro_seen";

export default function GatewayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const forceIntro = searchParams.get("intro") === "1";

  const [showIntro, setShowIntro] = useState(() => {
    if (forceIntro) return true;
    return !sessionStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (!forceIntro) return;

    sessionStorage.removeItem(STORAGE_KEY);
    setShowIntro(true);
    setSearchParams({}, { replace: true });
  }, [forceIntro, setSearchParams]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <div className="min-h-screen mesh-gradient-bg">
        <LandingTopNav />
        <div className="pt-16" />
        <LandingHero />
        <LandingSocialProof />
        <LandingProductDemo />
        <LandingAIEngine />
        <LandingGamification />
        <LandingCoachSection />
        <LandingIntegrations />
        <LandingFAQ />
        <LandingFinalCTA />
        <InstitutionalFooter />
      </div>
    </>
  );
}
