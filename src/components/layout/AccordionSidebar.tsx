import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { useWorkspace, type WorkspaceSection, type WorkspaceItem } from "@/hooks/useWorkspace";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useIsMobile } from "@/hooks/use-mobile";
import PatientQuickSearch from "@/components/patients/PatientQuickSearch";
import {
  ChevronDown, Trophy, LayoutDashboard, Users, UtensilsCrossed,
  ClipboardCheck, Dumbbell, Brain, FileText, Target, Activity,
  BarChart3, Sparkles, ChefHat, BookOpen, Calendar, DollarSign,
  Palette, Settings, Globe, Moon, Sun, Star, Shield, Zap,
  TrendingUp, Heart, MessageSquare, MessageCircle, Award, Crown, Compass,
  Megaphone, UserCheck, Scale, Lightbulb, Bot, Camera, Pill,
  GraduationCap, LogOut, ChevronRight, Search, AlertTriangle,
  Flame, ShoppingCart, Pin, X, Library
} from "lucide-react";
import { SmartMenuItem, MenuCategory, CATEGORY_COLORS } from "@/hooks/useSmartMenu";
import NewFeatureBadge from "@/components/common/NewFeatureBadge";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, Brain,
  ClipboardCheck, FileText, Activity, BarChart3, Sparkles, ChefHat,
  BookOpen, Calendar, DollarSign, Palette, Settings, Globe, Star,
  Shield, Zap, TrendingUp, Heart, MessageSquare, MessageCircle, Award, Crown,
  Compass, Megaphone, UserCheck, Scale, Lightbulb, Bot, Camera,
  Pill, GraduationCap, Dumbbell, Flame, ShoppingCart, AlertTriangle,
  Moon, Sun, LogOut, ChevronRight, Search, Pin, Library
};

function getIcon(name: string) {
  return ICON_MAP[name] || LayoutDashboard;
}

// Map categories to premium groups
const CATEGORY_TO_GROUP: Record<string, string> = {
  PRINCIPAL: "CLÍNICO",
  CLÍNICO: "CLÍNICO",
  NUTRIÇÃO: "CLÍNICO",
  ANALYTICS: "ACOMPANHAMENTO",
  PERFORMANCE: "ACOMPANHAMENTO",
  MARKETING: "GESTÃO",
  FERRAMENTAS: "BIBLIOTECA",
  CONTEÚDO: "BIBLIOTECA",
  ADMIN: "GESTÃO",
  PERSONAL: "CLÍNICO",
};

const GROUP_ORDER = ["CLÍNICO", "ACOMPANHAMENTO", "BIBLIOTECA", "GESTÃO", "CONFIGURAÇÕES"];

const GROUP_ICONS: Record<string, any> = {
  CLÍNICO: Heart,
  ACOMPANHAMENTO: Activity,
  BIBLIOTECA: Library,
  GESTÃO: BarChart3,
  CONFIGURAÇÕES: Settings,
};

const GROUP_COLORS: Record<string, string> = {
  CLÍNICO: "text-emerald-400",
  ACOMPANHAMENTO: "text-blue-400",
  BIBLIOTECA: "text-amber-400",
  GESTÃO: "text-rose-400",
  CONFIGURAÇÕES: "text-white/20",
};

// Fixed items that appear above groups
const FIXED_ROUTES = ["/ranking"];

interface Props {
  categories: MenuCategory[];
  flatItems: SmartMenuItem[];
  collapsed: boolean;
  isProRole: boolean;
  onLinkClick?: () => void;
  trackClick: (id: string) => void;
  loading?: boolean;
}

/**
 * Premium modal overlay for group items — centered on screen
 */
function SideFlyout({
  title,
  icon: SectionIcon,
  colorClass,
  items,
  onClose,
  onLinkClick,
  collapsed,
  renderItem,
}: {
  title: string;
  icon: any;
  colorClass: string;
  items: any[];
  onClose: () => void;
  onLinkClick?: () => void;
  collapsed: boolean;
  renderItem: (item: any, index: number) => React.ReactNode;
}) {
  return (
    <>
      {/* Full-screen backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Centered modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[106] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-card/95 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-primary/10 ring-1 ring-primary/20 shadow-inner">
              <SectionIcon className={`w-4.5 h-4.5 ${colorClass}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${colorClass}`}>
                {title}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-all hover:rotate-90 duration-200"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Items grid */}
          <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((item, i) => renderItem(item, i))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * Workspace-driven sidebar for professionals.
 * Renders sections and items from workspace_sections / workspace_items tables.
 */
function WorkspaceSidebar({ collapsed, onLinkClick }: { collapsed: boolean; onLinkClick?: () => void }) {
  const location = useLocation();
  const { t } = useTranslation();
  const { sections, getItemsForSection, loading } = useWorkspace();
  const { isRouteAllowed, isFeatureEnabled, minMode, isBasic } = useExperienceMode();
  const isMobile = useIsMobile();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const hasRole = isPatient || isNutritionist || isPersonal || isAdmin;

  if (loading || !hasRole) return <SidebarSkeleton />;

  const visibleSections = sections
    .filter(s => s.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleSections.length === 0) return null;

  return (
    <div className="space-y-1">
      {visibleSections.map(section => {
        const sectionItems = getItemsForSection(section.id).filter(item => {
          if (!item.is_visible) return false;
          
          // CRITICAL: Basic mode patients must see the diet menu regardless of premium/feature checks
          const isDietRoute = item.route === "/patient-meal-plan";
          if (isBasic && isPatient && isDietRoute) return true;

          // Priority 1: Specific feature check
          if (item.feature && !isFeatureEnabled(item.feature)) return false;
          // Priority 2: Generic premium check
          if (item.premium_only && !minMode("pro")) return false;
          return true;
        });
        
        const isPatientsSection = section.section_name.toLowerCase().includes("pacientes");
        if (sectionItems.length === 0 && !isPatientsSection) return null;
        
        const isOpen = openSection === section.id;
        const SectionIcon = ICON_MAP[section.section_icon] || LayoutDashboard;
        const hasActiveItem = sectionItems.some(item => location.pathname === item.route);
        const colorClass = section.section_color || "text-muted-foreground";

        const sorted = [...sectionItems].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return a.sort_order - b.sort_order;
        });

        return (
          <div key={section.id} className="relative mb-0.5">
            {isPatientsSection && !collapsed && (
              <div className="px-3 mb-2 flex items-center justify-between">
                 <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Atalho Rápido</h4>
                 <Link to="/patients" className="text-[9px] text-primary hover:underline font-bold">Ver Todos</Link>
              </div>
            )}
            <button
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-left group
                ${isOpen ? "bg-primary/10 shadow-sm" : hasActiveItem ? "bg-primary/5" : "hover:bg-muted/50"}
              `}
            >
              {!collapsed && (
                <>
                  <SectionIcon className={`w-3.5 h-3.5 ${colorClass} flex-shrink-0`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex-1 ${colorClass}`}>
                    {section.section_name}
                  </span>
                  {hasActiveItem && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </>
              )}
              {collapsed && (
                <SectionIcon className={`w-4 h-4 ${colorClass} mx-auto`} />
              )}
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                isMobile ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 ml-2 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-2">
                      {isPatientsSection && (
                        <Link
                          to="/patients"
                          onClick={() => { setOpenSection(null); onLinkClick?.(); }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-primary hover:bg-primary/5"
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-xs font-bold">Ver Todos os Pacientes</span>
                        </Link>
                      )}
                      {sorted.map((item) => {
                        const Icon = getIcon(item.icon || "LayoutDashboard");
                        const active = location.pathname === item.route;
                        const isPremium = item.premium_only;
                        const label = item.custom_label || item.label || "Item";

                        return (
                          <Link
                            key={item.id}
                            to={item.route || "/"}
                            onClick={() => {
                              setOpenSection(null);
                              onLinkClick?.();
                            }}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                              active
                                ? isPremium
                                  ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                                  : "bg-primary/10 text-primary ring-1 ring-primary/20"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            <Icon className={`h-4 w-4 flex-shrink-0 ${isPremium ? "text-amber-500" : active ? "text-primary" : ""}`} />
                            <span className={`min-w-0 flex-1 text-xs font-medium truncate ${isPremium ? "text-amber-500" : ""}`}>
                              {String(t(item.label_key || label, label))}
                            </span>
                            {isPremium && <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 ml-2 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-2">
                      {isPatientsSection && (
                        <Link
                          to="/patients"
                          onClick={() => { setOpenSection(null); onLinkClick?.(); }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-primary hover:bg-primary/5"
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-xs font-bold">Ver Todos os Pacientes</span>
                        </Link>
                      )}
                      {sorted.map((item) => {
                        const Icon = getIcon(item.icon || "LayoutDashboard");
                        const active = location.pathname === item.route;
                        const isPremium = item.premium_only;
                        const label = item.custom_label || item.label || "Item";

                        return (
                          <Link
                            key={item.id}
                            to={item.route || "/"}
                            onClick={() => {
                              setOpenSection(null);
                              onLinkClick?.();
                            }}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                              active
                                ? isPremium
                                  ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                                  : "bg-primary/10 text-primary ring-1 ring-primary/20"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            <Icon className={`h-4 w-4 flex-shrink-0 ${isPremium ? "text-amber-500" : active ? "text-primary" : ""}`} />
                            <span className={`min-w-0 flex-1 text-xs font-medium truncate ${isPremium ? "text-amber-500" : ""}`}>
                              {String(t(item.label_key || label, label))}
                            </span>
                            {isPremium && <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Sidebar skeleton to prevent layout shift during loading
 */
function SidebarSkeleton() {
  return (
    <div className="space-y-1 px-1 mt-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="mb-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/5 animate-pulse">
            <div className="w-3.5 h-3.5 rounded bg-muted/20" />
            <div className="h-2.5 w-24 rounded bg-muted/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LegacySidebar({ categories, flatItems, collapsed, isProRole, onLinkClick, trackClick }: any) {
  const location = useLocation();
  const { t } = useTranslation();
  const { isFeatureEnabled, minMode, mode, isBasic } = useExperienceMode();
  
  const isMobile = useIsMobile();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { isPatient, isNutritionist, isPersonal, isAdmin, loading } = useAuth();
  const hasRole = isPatient || isNutritionist || isPersonal || isAdmin;

  if (loading || !hasRole) return null;

  const allItems = categories.flatMap((c: any) => c.items).filter((item: any) => {
    const featureKey = item.feature || item.route.replace(/^\//, '');
    
    // CRITICAL: Basic mode patients must see the diet menu regardless of premium/feature checks
    const isDietRoute = item.route === "/patient-meal-plan";
    if (isBasic && isPatient && isDietRoute) return true;

    if (!isFeatureEnabled(featureKey)) return false;
    if (item.premium_only && !minMode("pro")) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const groups: Record<string, SmartMenuItem[]> = {};
    allItems.forEach((item: any) => {
      const g = CATEGORY_TO_GROUP[item.category] || "OUTROS";
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [allItems]);

  const sortedGroups = useMemo(() => {
    return GROUP_ORDER.filter(g => grouped[g] && grouped[g].length > 0);
  }, [grouped]);

  return (
    <div className="space-y-1">
      {sortedGroups.map((group) => {
        const items = grouped[group];
        const isOpen = openGroup === group;
        const GroupIcon = GROUP_ICONS[group] || LayoutDashboard;
        const colorClass = GROUP_COLORS[group] || "text-muted-foreground";
        const hasActive = items.some(i => location.pathname === i.route);

        return (
          <div key={group} className="relative mb-0.5">
            <button
              onClick={() => setOpenGroup(isOpen ? null : group)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-left group
                ${isOpen ? "bg-primary/10 shadow-sm" : hasActive ? "bg-primary/5" : "hover:bg-muted/50"}
              `}
            >
              {!collapsed && (
                <>
                  <GroupIcon className={`w-3.5 h-3.5 ${colorClass} flex-shrink-0`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex-1 ${colorClass}`}>
                    {group}
                  </span>
                  <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </>
              )}
              {collapsed && (
                <GroupIcon className={`w-4 h-4 ${colorClass} mx-auto`} />
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <SideFlyout
                  title={group}
                  icon={GroupIcon}
                  colorClass={colorClass}
                  items={items}
                  onClose={() => setOpenGroup(null)}
                  onLinkClick={onLinkClick}
                  collapsed={collapsed}
                  renderItem={(item) => {
                    const Icon = getIcon(item.icon);
                    const active = location.pathname === item.route;
                    const isPremium = item.premium_only;
                    return (
                      <Link
                        key={item.id}
                        to={item.route}
                        onClick={() => { 
                          trackClick(item.id); 
                          setOpenGroup(null); 
                          onLinkClick?.(); 
                        }}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all group/item text-center
                          ${active
                            ? isPremium
                              ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                              : "bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                      >
                        <Icon className={`w-5 h-5 transition-transform group-hover/item:scale-110 ${
                          isPremium ? "text-amber-500" : active ? "text-primary" : ""
                        }`} />
                        <span className={`text-[10px] font-medium leading-tight line-clamp-2 ${
                          isPremium ? "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-bold" : ""
                        }`}>
                          {String(t(item.label_key, item.label))}
                        </span>
                      </Link>
                    );
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function AccordionSidebar({ categories, flatItems, collapsed, isProRole, onLinkClick, trackClick, loading: menuLoading }: Props) {
  const { sections, loading: wsLoading } = useWorkspace();
  const { isProfessionalContext } = useWorkspaceContext();
  const { loading: authLoading } = useAuth();

  if (authLoading || (wsLoading && isProRole && isProfessionalContext) || menuLoading) {
    return <SidebarSkeleton />;
  }

  const hasWorkspaceConfig = isProRole && isProfessionalContext && sections.length > 0;

  return (
    <div className="flex flex-col h-full">
      {isProRole && (
        <div className="px-3 mb-4">
          <PatientQuickSearch 
            showIconOnly={collapsed}
            className="w-full"
          />
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {hasWorkspaceConfig ? (
          <WorkspaceSidebar collapsed={collapsed} onLinkClick={onLinkClick} />
        ) : (
          <LegacySidebar 
            categories={categories} 
            flatItems={flatItems} 
            collapsed={collapsed} 
            isProRole={isProRole} 
            onLinkClick={onLinkClick} 
            trackClick={trackClick} 
          />
        )}
      </div>
    </div>
  );
}
