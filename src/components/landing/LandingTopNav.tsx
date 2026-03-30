import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Coach Bodybuilder", href: "#coach-bodybuilder" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingTopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/60 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <FitJourneyLogo size="sm" collapsed={false} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth?tab=login">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white gap-1.5 text-sm"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Button>
          </Link>
          <Link to="/auth">
            <Button
              size="sm"
              className="bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-[hsl(152_58%_45%/0.2)] gap-1.5 text-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Criar conta
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-white/70 hover:text-white"
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-white/[0.06] bg-background/90 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-white/60 hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="border-t border-white/[0.06] mt-2 pt-3 flex flex-col gap-2">
                <Link to="/auth?tab=login" onClick={() => setMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white/60 hover:text-white gap-2 text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar na minha conta
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button
                    className="w-full bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white font-semibold rounded-xl gap-2 text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Criar conta gratuita
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
