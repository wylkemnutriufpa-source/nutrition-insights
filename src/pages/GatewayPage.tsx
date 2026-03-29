import { useState, useEffect, lazy, Suspense } from "react";
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

const STORAGE_KEY = "fj_intro_seen";

export default function GatewayPage() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem(STORAGE_KEY);
  });

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
      </AnimatePresence>

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
    </>
  );
}
