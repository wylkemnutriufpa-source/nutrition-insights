import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSidebarGroups } from "@/hooks/useLayoutPreference";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { useWorkspace, type WorkspaceSection, type WorkspaceItem } from "@/hooks/useWorkspace";
import {
  ChevronDown, Trophy, LayoutDashboard, Users, UtensilsCrossed,
  ClipboardCheck, Dumbbell, Brain, FileText, Target, Activity,
  BarChart3, Sparkles, ChefHat, BookOpen, Calendar, DollarSign,
  Palette, Settings, Globe, Moon, Sun, Star, Shield, Zap,
  TrendingUp, Heart, MessageSquare, MessageCircle, Award, Crown, Compass,
  Megaphone, UserCheck, Scale, Lightbulb, Bot, Camera, Pill,
  GraduationCap, LogOut, ChevronRight, Search, AlertTriangle,
  Flame, ShoppingCart, Pin, X,
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
  Moon, Sun, LogOut, ChevronRight, Search, Pin,
};

function getIcon(name: string) {
  return ICON_MAP[name] || LayoutDashboard;
}

// Map existing DB categories to new accordion groups
const CATEGORY_TO_GROUP: Record<string, string> = {
  PRINCIPAL: "CLÍNICO",
  CLÍNICO: "CLÍNICO",
  NUTRIÇÃO: "CLÍNICO",
  ANALYTICS: "ACOMPANHAMENTO",
  PERFORMANCE: "ACOMPANHAMENTO",
  MARKETING: "GESTÃO",
  FERRAMENTAS: "CONTEÚDO",
  CONTEÚDO: "CONTEÚDO",
  ADMIN: "GESTÃO",
  PERSONAL: "CLÍNICO",
};

const GROUP_ORDER = ["CLÍNICO", "ACOMPANHAMENTO", "ENGAJAMENTO", "CONTEÚDO", "GESTÃO", "CONFIGURAÇÕES"];

const GROUP_ICONS: Record<string, any> = {
  CLÍNICO: Heart,
  ACOMPANHAMENTO: TrendingUp,
  ENGAJAMENTO: Trophy,
  CONTEÚDO: BookOpen,
  GESTÃO: BarChart3,
  CONFIGURAÇÕES: Settings,
};

const GROUP_COLORS: Record<string, string> = {
  CLÍNICO: "text-sky-400",
  ACOMPANHAMENTO: "text-emerald-400",
  ENGAJAMENTO: "text-amber-400",
  CONTEÚDO: "text-violet-400",
  GESTÃO: "text-rose-400",
  CONFIGURAÇÕES: "text-muted-foreground",
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
}

/**
 * Side flyout panel for group items — premium modal style
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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Flyout panel */}
      <motion.div
        initial={{ x: -12, opacity: 0, scale: 0.96 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: -12, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-full top-0 ml-2 z-50 w-56"
        style={{ maxHeight: "80vh" }}
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10`}>
              <SectionIcon className={`w-3.5 h-3.5 ${colorClass}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider flex-1 ${colorClass}`}>
              {title}
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {/* Items */}
          <div className="p-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div className="space-y-0.5">
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
  const { isRouteAllowed } = useExperienceMode();
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (loading) return null;

  const visibleSections = sections
    .filter(s => s.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleSections.length === 0) return null;

  return (
    <div className="space-y-1">
      {visibleSections.map(section => {
        const sectionItems = getItemsForSection(section.id).filter(i => i.is_visible && isRouteAllowed(i.route || "/"));
        
        if (sectionItems.length === 0) return null;
        
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

            <AnimatePresence>
              {isOpen && (
                <SideFlyout
                  title={section.section_name}
                  icon={SectionIcon}
                  colorClass={colorClass}
                  items={sorted}
                  onClose={() => setOpenSection(null)}
                  onLinkClick={onLinkClick}
                  collapsed={collapsed}
                  renderItem={(item) => {
                    const Icon = getIcon(item.icon || "LayoutDashboard");
                    const active = location.pathname === item.route;
                    const isPremium = item.premium_only;
                    const label = item.custom_label || item.label || "Item";

                    return (
                      <Link
                        key={item.id}
                        to={item.route || "/"}
                        onClick={() => { setOpenSection(null); onLinkClick?.(); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group/item
                          ${active
                            ? isPremium
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover/item:scale-110 ${
                          isPremium ? "text-amber-500" : active ? "text-primary" : ""
                        }`} />
                        <span className={`text-xs font-medium truncate flex-1 ${
                          isPremium ? "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-bold" : ""
                        }`}>
                          {t(item.label_key || label, label)}
                        </span>
                        <NewFeatureBadge featureKey={item.route || ""} variant="dot" />
                        {item.is_pinned && (
                          <Pin className="w-2.5 h-2.5 text-primary/50" />
                        )}
                        {active && !item.is_pinned && (
                          <ChevronRight className={`w-3 h-3 ${isPremium ? "text-amber-500" : "text-primary"}`} />
                        )}
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

/**
 * Main sidebar component.
 * For professionals with workspace config → renders from workspace tables.
 * Otherwise → falls back to legacy AccordionSidebar groups.
 */
export default function AccordionSidebar({ categories, flatItems, collapsed, isProRole, onLinkClick, trackClick }: Props) {
  const { sections, loading: wsLoading } = useWorkspace();

  const hasWorkspaceConfig = isProRole && !wsLoading && sections.length > 0;

  if (hasWorkspaceConfig) {
    return <WorkspaceSidebar collapsed={collapsed} onLinkClick={onLinkClick} />;
  }

  return <LegacySidebar categories={categories} flatItems={flatItems} collapsed={collapsed} isProRole={isProRole} onLinkClick={onLinkClick} trackClick={trackClick} />;
}

function LegacySidebar({ categories, flatItems, collapsed, isProRole, onLinkClick, trackClick }: Props) {
  const location = useLocation();
  const { t } = useTranslation();
  const { isRouteAllowed } = useExperienceMode();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const allItems = categories.flatMap((c) => c.items).filter(item => isRouteAllowed(item.route));
  const fixedItems = allItems.filter((item) => FIXED_ROUTES.includes(item.route));

  const groupedMap = new Map<string, SmartMenuItem[]>();
  GROUP_ORDER.forEach((g) => groupedMap.set(g, []));

  allItems
    .filter((item) => !FIXED_ROUTES.includes(item.route))
    .forEach((item) => {
      const group = CATEGORY_TO_GROUP[item.category] || "CONTEÚDO";
      const existing = groupedMap.get(group) || [];
      existing.push(item);
      groupedMap.set(group, existing);
    });

  const groups = GROUP_ORDER
    .map((name) => ({ name, items: groupedMap.get(name) || [] }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-1">
      {fixedItems.map((item) => {
        const Icon = getIcon(item.icon);
        const active = location.pathname === item.route;
        return (
          <Link
            key={item.id}
            to={item.route}
            onClick={() => { trackClick(item.id); onLinkClick?.(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border mb-2
              ${active
                ? "bg-gradient-to-r from-amber-500/15 to-amber-600/10 border-amber-500/30 shadow-sm"
                : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
              }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-amber-500/20" : "bg-amber-500/10"}`}>
              <Icon className="w-4 h-4 text-amber-500" />
            </div>
            {!collapsed && (
              <span className="text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                {t(item.label_key, item.label)}
              </span>
            )}
            {active && !collapsed && <Crown className="w-3.5 h-3.5 ml-auto text-amber-500" />}
          </Link>
        );
      })}

      {groups.map((group) => {
        const isOpen = openGroup === group.name;
        const GroupIcon = GROUP_ICONS[group.name] || Settings;
        const hasActiveItem = group.items.some((item) => location.pathname === item.route);
        const colorClass = GROUP_COLORS[group.name] || "text-muted-foreground";

        return (
          <div key={group.name} className="relative mb-0.5">
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.name)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-left group
                ${isOpen ? "bg-primary/10 shadow-sm" : hasActiveItem ? "bg-primary/5" : "hover:bg-muted/50"}
              `}
            >
              {!collapsed && (
                <>
                  <GroupIcon className={`w-3.5 h-3.5 ${colorClass} flex-shrink-0`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex-1 ${colorClass}`}>
                    {group.name}
                  </span>
                  {hasActiveItem && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
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
                  title={group.name}
                  icon={GroupIcon}
                  colorClass={colorClass}
                  items={group.items}
                  onClose={() => setOpenGroup(null)}
                  onLinkClick={onLinkClick}
                  collapsed={collapsed}
                  renderItem={(menuItem) => {
                    const Icon = getIcon(menuItem.icon);
                    const active = location.pathname === menuItem.route;
                    const isPremium = menuItem.premium_only;

                    return (
                      <Link
                        key={menuItem.id}
                        to={menuItem.route}
                        onClick={() => { trackClick(menuItem.id); setOpenGroup(null); onLinkClick?.(); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group/item
                          ${active
                            ? isPremium
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover/item:scale-110 ${
                          isPremium ? "text-amber-500" : active ? "text-primary" : ""
                        }`} />
                        <span className={`text-xs font-medium truncate ${
                          isPremium ? "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-bold" : ""
                        }`}>
                          {t(menuItem.label_key, menuItem.label)}
                        </span>
                        {active && (
                          <ChevronRight className={`w-3 h-3 ml-auto ${isPremium ? "text-amber-500" : "text-primary"}`} />
                        )}
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
