import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, LogOut, Moon, Sun, ChevronRight, Sparkles, Settings,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Menu, X, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen, DollarSign, Pill, Crown, Compass,
  CalendarDays, Megaphone, Globe, UserCheck, Share2, Award, CreditCard, Dumbbell
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import CommandPalette from "@/components/common/CommandPalette";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SOSModal from "@/components/patient/SOSModal";
import SOSInbox from "@/components/patient/SOSInbox";
import LanguageSelector from "@/components/common/LanguageSelector";
import BrainIntelligence from "@/components/common/BrainIntelligence";
import { AlertTriangle } from "lucide-react";
import ProtocolBlockedModal from "@/components/biquini/ProtocolBlockedModal";

type NavLink = { to: string; icon: any; labelKey: string; premium?: boolean; color?: string; iconColor?: string };
type NavSection = { sectionKey: string; links: NavLink[] };

const nutritionistSections: NavSection[] = [
  {
    sectionKey: "nav.sectionMain",
    links: [
      { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
      { to: "/ranking", icon: Trophy, labelKey: "nav.ranking", premium: true },
      { to: "/programs", icon: Rocket, labelKey: "nav.programs", premium: true },
      { to: "/patients", icon: Users, labelKey: "nav.patients" },
      { to: "/checkin-panel", icon: ClipboardCheck, labelKey: "nav.checkins" },
      { to: "/appointments", icon: Activity, labelKey: "nav.agenda" },
      { to: "/planner", icon: CalendarDays, labelKey: "nav.planner" },
      { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
    ],
  },
  {
    sectionKey: "nav.sectionClinical",
    links: [
      { to: "/weekly-goals", icon: Target, labelKey: "nav.goals" },
      { to: "/protocols", icon: FileText, labelKey: "nav.protocols" },
      { to: "/automation", icon: Bot, labelKey: "nav.automation" },
      { to: "/supplements", icon: Pill, labelKey: "nav.supplements" },
    ],
  },
  {
    sectionKey: "nav.sectionNutrition",
    links: [
      { to: "/meal-plans", icon: UtensilsCrossed, labelKey: "nav.mealPlans" },
      { to: "/diet-templates", icon: BookOpen, labelKey: "nav.templates" },
      { to: "/recipes", icon: ChefHat, labelKey: "nav.recipes" },
      { to: "/food-database", icon: Apple, labelKey: "nav.foods" },
    ],
  },
  {
    sectionKey: "nav.sectionAnalytics",
    links: [
      { to: "/reports", icon: BarChart3, labelKey: "nav.reports" },
      { to: "/clinical-intelligence", icon: Activity, labelKey: "nav.clinicalIntel" },
      { to: "/weekly-report", icon: FileBarChart, labelKey: "nav.weeklyReport" },
      { to: "/financial", icon: DollarSign, labelKey: "nav.financial" },
    ],
  },
  {
    sectionKey: "nav.sectionMarketing",
    links: [
      { to: "/branding", icon: Palette, labelKey: "nav.branding" },
      { to: "/my-public-profile", icon: Globe, labelKey: "nav.myPublicProfile" },
      { to: "/my-referrals", icon: Share2, labelKey: "nav.myReferrals" },
      { to: "/ambassador", icon: Award, labelKey: "nav.ambassador", premium: true },
    ],
  },
  {
    sectionKey: "nav.sectionContent",
    links: [
      { to: "/global-tips", icon: Lightbulb, labelKey: "nav.tips" },
      { to: "/curiosidades", icon: Sparkles, labelKey: "nav.curiosidades" },
      { to: "/feedbacks", icon: MessageSquare, labelKey: "nav.feedbacks" },
      { to: "/professional-guide", icon: Compass, labelKey: "nav.professionalGuide" },
      { to: "/user-guide", icon: BookOpen, labelKey: "nav.patientGuide" },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    sectionKey: "nav.sectionAdmin",
    links: [
      { to: "/admin", icon: Shield, labelKey: "nav.adminPanel" },
      { to: "/admin/resources", icon: LayoutDashboard, labelKey: "nav.resources" },
      { to: "/admin/features", icon: Zap, labelKey: "nav.featureFlags" },
      { to: "/admin/pricing", icon: DollarSign, labelKey: "nav.pricing" },
      { to: "/admin/patient-features", icon: Crown, labelKey: "nav.patientFeatures" },
      { to: "/admin/landing-pages", icon: LayoutDashboard, labelKey: "nav.landingPages" },
      { to: "/admin/booking-settings", icon: CalendarDays, labelKey: "nav.bookingSettings" },
      { to: "/admin/subscription-monitor", icon: CreditCard, labelKey: "nav.subscriptionMonitor" },
    ],
  },
  {
    sectionKey: "nav.sectionMain",
    links: [
      { to: "/ranking", icon: Trophy, labelKey: "nav.ranking", premium: true },
      { to: "/programs", icon: Rocket, labelKey: "nav.programs", premium: true },
      { to: "/patients", icon: Users, labelKey: "nav.patients" },
      { to: "/appointments", icon: Activity, labelKey: "nav.agenda" },
      { to: "/planner", icon: CalendarDays, labelKey: "nav.planner" },
      { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
      { to: "/automation", icon: Bot, labelKey: "nav.automation" },
    ],
  },
  {
    sectionKey: "nav.sectionAnalytics",
    links: [
      { to: "/reports", icon: BarChart3, labelKey: "nav.reports" },
      { to: "/food-database", icon: Apple, labelKey: "nav.foods" },
    ],
  },
  {
    sectionKey: "nav.sectionMarketing",
    links: [
      { to: "/branding", icon: Palette, labelKey: "nav.branding" },
      { to: "/admin/testimonials", icon: Star, labelKey: "nav.testimonials" },
      { to: "/admin/growth", icon: TrendingUp, labelKey: "nav.growthDashboard" },
      { to: "/admin/affiliates", icon: Award, labelKey: "nav.affiliates", premium: true },
    ],
  },
  {
    sectionKey: "nav.sectionContent",
    links: [
      { to: "/global-tips", icon: Lightbulb, labelKey: "nav.tips" },
      { to: "/curiosidades", icon: Sparkles, labelKey: "nav.curiosidades" },
      { to: "/professional-guide", icon: Compass, labelKey: "nav.professionalGuide" },
      { to: "/user-guide", icon: BookOpen, labelKey: "nav.patientGuide" },
    ],
  },
];

const patientLinks = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/ranking", icon: Trophy, labelKey: "nav.ranking", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/checkin", icon: ClipboardCheck, labelKey: "nav.checkin", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/checklist", icon: CheckCircle2, labelKey: "nav.checklist", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/my-diet", icon: UtensilsCrossed, labelKey: "nav.myDiet", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/weekly-goals", icon: Target, labelKey: "nav.goals", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/appointments", icon: Activity, labelKey: "nav.agenda", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/planner", icon: CalendarDays, labelKey: "nav.planner", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/meals", icon: Leaf, labelKey: "nav.meals", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/recipes", icon: ChefHat, labelKey: "nav.recipes", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/shopping-list", icon: ShoppingCart, labelKey: "nav.shopping", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/journey", icon: TrendingUp, labelKey: "nav.journey", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/library", icon: BookOpen, labelKey: "nav.library", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/supplements", icon: Pill, labelKey: "nav.supplements", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/anamnesis", icon: ClipboardCheck, labelKey: "nav.anamnesis", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/onboarding", icon: Zap, labelKey: "nav.onboarding", color: "from-primary/20 to-accent/5", iconColor: "text-primary" },
  { to: "/food-database", icon: Apple, labelKey: "nav.foods", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/weight-calculator", icon: Scale, labelKey: "nav.idealWeight", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/water-calculator", icon: Droplets, labelKey: "nav.hydration", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/health-quiz", icon: Heart, labelKey: "nav.healthCheck", color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
  { to: "/global-tips", icon: Lightbulb, labelKey: "nav.tips", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/curiosidades", icon: Sparkles, labelKey: "nav.curiosidades", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/user-guide", icon: Compass, labelKey: "nav.userGuide", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/feedbacks", icon: MessageSquare, labelKey: "nav.feedbacks", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/achievements", icon: Trophy, labelKey: "nav.achievements", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/challenges", icon: Target, labelKey: "nav.challenges", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/ambassador", icon: Award, labelKey: "nav.ambassador", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
];

function RenderLink({ link, active, collapsed, isNutritionist, onLinkClick, t }: {
  link: NavLink; active: boolean; collapsed: boolean; isNutritionist: boolean; onLinkClick?: () => void; t: any;
}) {
  const hasColor = link.color && !isNutritionist;
  const isPremium = link.premium;

  if (hasColor && !collapsed) {
    return (
      <Link
        to={link.to}
        onClick={onLinkClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group border
          hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
          ${active
            ? `bg-gradient-to-r ${link.color} border-primary/20 shadow-sm`
            : "border-transparent hover:border-border hover:bg-muted/50"
          }`}
        style={{ transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          active ? "bg-card shadow-sm animate-pulse" : "bg-muted/50 group-hover:bg-card group-hover:shadow-sm"
        }`}>
          <link.icon className={`w-3.5 h-3.5 ${active ? link.iconColor : "text-muted-foreground"}`} />
        </div>
        <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{t(link.labelKey)}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary animate-bounce" />}
      </Link>
    );
  }

  return (
    <Link
      to={link.to}
      onClick={onLinkClick}
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
      <link.icon className={`w-4 h-4 flex-shrink-0 ${
        isPremium ? "text-amber-500" : active ? "text-primary animate-pulse" : "group-hover:scale-110 transition-transform"
      }`} />
      {!collapsed && (
        <span className={`text-xs font-medium ${
          isPremium ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent font-bold" : ""
        }`}>{t(link.labelKey)}</span>
      )}
      {active && !collapsed && <ChevronRight className={`w-3.5 h-3.5 ml-auto animate-bounce ${isPremium ? "text-amber-500" : "text-primary"}`} />}
    </Link>
  );
}

function SidebarContent({
  sections,
  flatLinks,
  location,
  collapsed,
  isNutritionist,
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  setCollapsed,
  onLinkClick,
  onSosOpen,
}: {
  sections?: NavSection[];
  flatLinks?: NavLink[];
  location: ReturnType<typeof useLocation>;
  collapsed: boolean;
  isNutritionist: boolean;
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  setCollapsed?: (v: boolean) => void;
  onLinkClick?: () => void;
  onSosOpen?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <FitJourneyLogo collapsed={collapsed} size="md" />
        <BrainIntelligence collapsed={collapsed} />
      </div>

      {/* Nav links */}
      <ScrollArea className="flex-1 px-3 mt-4">
        <nav className="space-y-1 pb-4">
          {sections ? sections.map((section, idx) => (
            <div key={section.sectionKey} className={idx > 0 ? "mt-4" : ""}>
              {!collapsed && (
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  ({
                    "nav.sectionMain": "text-emerald-400",
                    "nav.sectionClinical": "text-sky-400",
                    "nav.sectionNutrition": "text-violet-400",
                    "nav.sectionAnalytics": "text-cyan-400",
                    "nav.sectionMarketing": "text-amber-500",
                    "nav.sectionContent": "text-rose-400",
                    "nav.sectionAdmin": "text-red-400",
                  } as Record<string, string>)[section.sectionKey] || "text-muted-foreground/60"
                }`}>
                  {t(section.sectionKey)}
                </div>
              )}
              {collapsed && idx > 0 && (
                <div className="mx-3 my-2 border-t border-border/30" />
              )}
              <div className="space-y-0.5">
                {section.links.map((link) => (
                  <RenderLink
                    key={link.to}
                    link={link}
                    active={location.pathname === link.to}
                    collapsed={collapsed}
                    isNutritionist={isNutritionist}
                    onLinkClick={onLinkClick}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )) : flatLinks?.map((link) => (
            <RenderLink
              key={link.to}
              link={link}
              active={location.pathname === link.to}
              collapsed={collapsed}
              isNutritionist={isNutritionist}
              onLinkClick={onLinkClick}
              t={t}
            />
          ))}

          {!isNutritionist && !sections && (
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
          {(isNutritionist || sections) && (
            <button
              onClick={() => { onSosOpen?.(); onLinkClick?.(); }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 mt-3 w-full hover:bg-destructive/20 transition-all"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs font-medium">{t("nav.sosInbox")}</span>}
            </button>
          )}
        </nav>
      </ScrollArea>

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
  const { profile, isNutritionist, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosInboxOpen, setSosInboxOpen] = useState(false);

  const isPatient = !isNutritionist && !isAdmin;

  // Track presence for all logged-in users
  usePresenceTracker();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sections = isAdmin ? adminSections : isNutritionist ? nutritionistSections : undefined;
  const flatLinks = isPatient ? patientLinks : undefined;

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

  const onSosHandler = isPatient ? () => setSosOpen(true) : (isNutritionist || isAdmin) ? () => setSosInboxOpen(true) : undefined;

  const sidebarProps = {
    sections, flatLinks, location, isNutritionist: isNutritionist || isAdmin, dark, toggleDark, initials, profileName, signOut,
    onSosOpen: onSosHandler,
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background particles-bg">
        <CommandPalette />
        <OnboardingWizard />
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 glass-premium border-b border-border/50 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 flex flex-col bg-card/95 backdrop-blur-xl">
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
            <NotificationBell />
          </div>
        </div>

        {/* Main content */}
        <main className="pt-14">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 max-w-7xl mx-auto"
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
            <NotificationBell />
          </div>
        </div>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
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
