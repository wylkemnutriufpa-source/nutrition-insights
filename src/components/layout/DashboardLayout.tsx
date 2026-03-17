import { ReactNode, useEffect, useState as useStateReact } from "react";
import OfflineSyncBanner from "@/components/common/OfflineSyncBanner";
import SmartResumeModal from "@/components/common/SmartResumeModal";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, LogOut, Moon, Sun, ChevronRight, Sparkles, Settings,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Menu, X, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen, DollarSign, Pill, Crown, Compass,
  CalendarDays, Megaphone, Globe, UserCheck, Share2, Award, CreditCard, Dumbbell, GraduationCap
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import CommandPalette, { openCommandPalette } from "@/components/common/CommandPalette";
import { Search } from "lucide-react";
import OnboardingWizard, { useOnboardingNotification, openOnboardingManually } from "@/components/onboarding/OnboardingWizard";
import SOSModal from "@/components/patient/SOSModal";
import SOSInbox from "@/components/patient/SOSInbox";
import LanguageSelector from "@/components/common/LanguageSelector";
import BrainIntelligence from "@/components/common/BrainIntelligence";
import { AlertTriangle } from "lucide-react";
import ProtocolBlockedModal from "@/components/biquini/ProtocolBlockedModal";
import { useSmartMenu, SmartMenuItem, MenuCategory, CATEGORY_COLORS } from "@/hooks/useSmartMenu";

// Icon registry - maps string names to Lucide components
const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, LogOut, Moon, Sun, Sparkles, Settings,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen, DollarSign, Pill, Crown, Compass,
  CalendarDays, Megaphone, Globe, UserCheck, Share2, Award, CreditCard, Dumbbell, GraduationCap,
  Menu, X, ChevronRight, Search, AlertTriangle,
};

function getIcon(name: string) {
  return ICON_MAP[name] || LayoutDashboard;
}

function RenderSmartLink({ item, active, collapsed, isProRole, onLinkClick, trackClick, t }: {
  item: SmartMenuItem; active: boolean; collapsed: boolean; isProRole: boolean; onLinkClick?: () => void; trackClick: (id: string) => void; t: any;
}) {
  const Icon = getIcon(item.icon);
  const hasColor = item.color && !isProRole;
  const isPremium = item.premium_only;

  // Map routes to tour data attributes
  const TOUR_MAP: Record<string, string> = {
    "/": "dashboard", "/patients": "patients", "/editor-v2": "meal-editor",
    "/automacoes": "automation", "/financeiro": "financial",
    "/checklist": "checklist", "/plano-alimentar": "meal-plan",
    "/checkin": "checkin", "/chat": "chat", "/jornada": "gamification",
    "/alertas-clinicos": "alerts",
  };
  const tourId = TOUR_MAP[item.route];

  const handleClick = () => {
    trackClick(item.id);
    onLinkClick?.();
  };

  if (hasColor && !collapsed) {
    return (
      <Link
        to={item.route}
        onClick={handleClick}
        {...(tourId ? { "data-tour": tourId } : {})}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group border
          hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
          ${active
            ? `bg-gradient-to-r ${item.color} border-primary/20 shadow-sm`
            : "border-transparent hover:border-border hover:bg-muted/50"
          }`}
        style={{ transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          active ? "bg-card shadow-sm animate-pulse" : "bg-muted/50 group-hover:bg-card group-hover:shadow-sm"
        }`}>
          <Icon className={`w-3.5 h-3.5 ${active ? (item.icon_color || "text-primary") : "text-muted-foreground"}`} />
        </div>
        <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
          {t(item.label_key, item.label)}
        </span>
        {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary animate-bounce" />}
      </Link>
    );
  }

  return (
    <Link
      to={item.route}
      onClick={handleClick}
      {...(tourId ? { "data-tour": tourId } : {})}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group
        hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
        ${isPremium && !active
          ? "border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10"
          : ""
        }
        ${active
          ? isPremium ? "bg-gradient-to-r from-amber-500/15 to-amber-600/5 text-amber-500 border border-amber-500/30" : "bg-primary/10 text-primary"
          : !isPremium ? "text-muted-foreground hover:text-foreground hover:bg-muted" : ""
        }`}
      style={{ transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${
        isPremium ? "text-amber-500" : item.icon_color ? item.icon_color : active ? "text-primary animate-pulse" : "group-hover:scale-110 transition-transform"
      }`} />
      {!collapsed && (
        <span className={`text-xs font-medium ${
          isPremium ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent font-bold" : ""
        }`}>{t(item.label_key, item.label)}</span>
      )}
      {active && !collapsed && <ChevronRight className={`w-3.5 h-3.5 ml-auto animate-bounce ${isPremium ? "text-amber-500" : "text-primary"}`} />}
    </Link>
  );
}

// Pending plans sidebar widget for nutritionists
function PendingPlansWidget({ collapsed, onLinkClick }: { collapsed: boolean; onLinkClick?: () => void }) {
  const [count, setCount] = useStateReact(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("onboarding_pipelines" as any)
        .select("id", { count: "exact", head: true })
        .eq("nutritionist_id", user.id)
        .in("status", ["pending_approval", "pending_plan_generation"]);
      setCount(c || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (count === 0) return null;

  return (
    <Link
      to="/onboarding-pipeline"
      onClick={onLinkClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-3 w-full hover:bg-amber-500/15 transition-all group"
    >
      <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Planos Pendentes</span>
          <p className="text-[10px] text-muted-foreground">{count} aguardando análise</p>
        </div>
      )}
      {!collapsed && (
        <span className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
          {count}
        </span>
      )}
      {collapsed && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  categories,
  flatItems,
  location,
  collapsed,
  isProRole,
  isPatient,
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  setCollapsed,
  onLinkClick,
  onSosOpen,
  trackClick,
  userRole,
}: {
  categories: MenuCategory[];
  flatItems: SmartMenuItem[];
  location: ReturnType<typeof useLocation>;
  collapsed: boolean;
  isProRole: boolean;
  isPatient: boolean;
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  setCollapsed?: (v: boolean) => void;
  onLinkClick?: () => void;
  onSosOpen?: () => void;
  trackClick: (id: string) => void;
  userRole: string;
}) {
  const { t } = useTranslation();
  const useFlat = isPatient;

  return (
    <>
      {/* Logo */}
      <div className="p-4 flex flex-col gap-2">
        <FitJourneyLogo collapsed={collapsed} size="md" />
        <BrainIntelligence collapsed={collapsed} />
      </div>

      {/* Nav links */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 mt-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <nav className="space-y-1 pb-4">
          {!useFlat ? categories.map((cat, idx) => (
            <div key={cat.category} className={idx > 0 ? "mt-4" : ""}>
              {!collapsed && (
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  CATEGORY_COLORS[cat.category] || "text-muted-foreground/60"
                }`}>
                  {cat.category}
                </div>
              )}
              {collapsed && idx > 0 && (
                <div className="mx-3 my-2 border-t border-border/30" />
              )}
              <div className="space-y-0.5">
                {cat.items.map((item) => (
                  <RenderSmartLink
                    key={item.id}
                    item={item}
                    active={location.pathname === item.route}
                    collapsed={collapsed}
                    isProRole={isProRole}
                    onLinkClick={onLinkClick}
                    trackClick={trackClick}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )) : flatItems.map((item) => (
            <RenderSmartLink
              key={item.id}
              item={item}
              active={location.pathname === item.route}
              collapsed={collapsed}
              isProRole={isProRole}
              onLinkClick={onLinkClick}
              trackClick={trackClick}
              t={t}
            />
          ))}

          {/* Special buttons: Analyze AI + SOS for patients */}
          {isPatient && (
            <>
              <Link
                to="/analyze"
                onClick={onLinkClick}
                className="flex items-center gap-3 px-3 py-2 rounded-xl gradient-primary text-primary-foreground mt-3 shadow-glow shimmer-sweep"
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{t("nav.analyzeAI")}</span>}
              </Link>
              <button
                onClick={() => { onSosOpen?.(); onLinkClick?.(); }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 mt-2 w-full hover:bg-destructive/20 transition-all"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{t("nav.sos")}</span>}
              </button>
            </>
          )}
          {isProRole && (
            <>
              {(["admin", "nutritionist", "personal"].includes(userRole)) && (
                <Link
                  to="/editor-v2"
                  data-tour="meal-editor"
                  onClick={onLinkClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mt-3 w-full border transition-all ${
                    location.pathname === "/editor-v2" || /^\/meal-plans\/[^/]+$/.test(location.pathname)
                      ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                      : "bg-card/60 text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold">Editor Premium V2</span>
                      <p className="text-[10px] text-muted-foreground">Abrir editor novo</p>
                    </div>
                  )}
                </Link>
              )}
              <PendingPlansWidget collapsed={collapsed} onLinkClick={onLinkClick} />
              <button
                onClick={() => { onSosOpen?.(); onLinkClick?.(); }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 mt-2 w-full hover:bg-destructive/20 transition-all"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{t("nav.sosInbox")}</span>}
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <Link
          to="/settings"
          onClick={onLinkClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-all"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">{t("nav.settings")}</span>}
        </Link>

        <LanguageSelector collapsed={collapsed} />

        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-all"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">{dark ? t("nav.lightMode") : t("nav.darkMode")}</span>}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profileName}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => { signOut(); onLinkClick?.(); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">{t("nav.signOut")}</span>}
        </button>

        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, isNutritionist, isPersonal, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosInboxOpen, setSosInboxOpen] = useState(false);
  const { showBadge: showOnboardingBadge } = useOnboardingNotification();
  const { categories, flatItems, loading: menuLoading, trackClick, userRole } = useSmartMenu();

  const isPatient = !isNutritionist && !isPersonal && !isAdmin;
  const isProRole = isNutritionist || isPersonal || isAdmin;

  // Track presence for all logged-in users
  usePresenceTracker();

  // Preserve native scroll position to avoid interrupting long editing flows.

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleDark = () => {
    const newDark = !dark;
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newDark ? "dark" : "light");
    setDark(newDark);
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileName = profile?.full_name || "Usuário";

  const onSosHandler = isPatient ? () => setSosOpen(true) : isProRole ? () => setSosInboxOpen(true) : undefined;

  const sidebarProps = {
    categories,
    flatItems,
    location,
    isProRole,
    isPatient,
    dark,
    toggleDark,
    initials,
    profileName,
    signOut,
    onSosOpen: onSosHandler,
    trackClick,
    userRole,
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background particles-bg">
        <CommandPalette />
        <OnboardingWizard />
        <SmartResumeModal />
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 glass-premium border-b border-border/50 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 flex flex-col bg-card/95 backdrop-blur-xl h-full max-h-screen overflow-hidden">
                <SidebarContent {...sidebarProps} collapsed={false} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm">
                Fit<span className="text-gradient">Journey</span>
              </span>
            </Link>
            <BrainIntelligence collapsed />
          </div>
          <div className="flex items-center gap-1">
            {location.pathname !== "/" && (
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <LayoutDashboard className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={openCommandPalette}>
              <Search className="w-4 h-4" />
            </Button>
            {showOnboardingBadge && (
              <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={openOnboardingManually}>
                <GraduationCap className="w-4 h-4 text-primary" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>
            )}
            <NotificationBell />
          </div>
        </div>

        <OfflineSyncBanner />

        <main className="pt-14">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 sm:p-4 max-w-7xl mx-auto pb-20"
          >
            {children}
          </motion.div>
        </main>
        {isPatient && <SOSModal open={sosOpen} onOpenChange={setSosOpen} />}
        {isPatient && <ProtocolBlockedModal />}
        {(isNutritionist || isAdmin) && <SOSInbox open={sosInboxOpen} onOpenChange={setSosInboxOpen} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background particles-bg">
      <CommandPalette />
      <OnboardingWizard />
      <SmartResumeModal />
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-screen border-r border-border/50 bg-card/95 backdrop-blur-xl flex flex-col z-50"
      >
        <SidebarContent {...sidebarProps} collapsed={collapsed} setCollapsed={setCollapsed} />
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        <div
          className="fixed top-0 right-0 z-40 p-3 transition-[left] duration-200"
          style={{ left: collapsed ? 72 : 260 }}
        >
          <div className="flex items-center justify-end gap-1">
            {location.pathname !== "/" && (
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openCommandPalette} title="Buscar (Ctrl+K)">
              <Search className="w-4 h-4" />
            </Button>
            {showOnboardingBadge && (
              <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={openOnboardingManually} title="Tour de onboarding">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>
            )}
            <NotificationBell />
          </div>
        </div>
        <OfflineSyncBanner />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6 pt-14 max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
      {isPatient && <SOSModal open={sosOpen} onOpenChange={setSosOpen} />}
      {isPatient && <ProtocolBlockedModal />}
      {(isNutritionist || isAdmin) && <SOSInbox open={sosInboxOpen} onOpenChange={setSosInboxOpen} />}
    </div>
  );
}
