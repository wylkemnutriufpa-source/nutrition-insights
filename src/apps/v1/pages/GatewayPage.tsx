import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingHero from "@/components/landing/LandingHero";
import LandingSocialProof from "@/components/landing/LandingSocialProof";
import LandingProductDemo from "@/components/landing/LandingProductDemo";
import LandingAIEngine from "@/components/landing/LandingAIEngine";
import LandingGamification from "@/components/landing/LandingGamification";
import LandingCoachSection from "@/components/landing/LandingCoachSection";
import LandingIntegrations from "@/components/landing/LandingIntegrations";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import CinematicIntro from "@/components/landing/CinematicIntro";
import InstitutionalFooter from "@/components/institutional/InstitutionalFooter";
import LandingTopNav from "@/components/landing/LandingTopNav";

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
