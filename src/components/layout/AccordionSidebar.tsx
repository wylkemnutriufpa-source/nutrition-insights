import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSidebarGroups } from "@/hooks/useLayoutPreference";
import {
  ChevronDown, Trophy, LayoutDashboard, Users, UtensilsCrossed,
  ClipboardCheck, Dumbbell, Brain, FileText, Target, Activity,
  BarChart3, Sparkles, ChefHat, BookOpen, Calendar, DollarSign,
  Palette, Settings, Globe, Moon, Sun, Star, Shield, Zap,
  TrendingUp, Heart, MessageSquare, MessageCircle, Award, Crown, Compass,
  Megaphone, UserCheck, Scale, Lightbulb, Bot, Camera, Pill,
  GraduationCap, LogOut, ChevronRight, Search, AlertTriangle,
  Flame, ShoppingCart,
} from "lucide-react";
import { SmartMenuItem, MenuCategory, CATEGORY_COLORS } from "@/hooks/useSmartMenu";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, Brain,
  ClipboardCheck, FileText, Activity, BarChart3, Sparkles, ChefHat,
  BookOpen, Calendar, DollarSign, Palette, Settings, Globe, Star,
  Shield, Zap, TrendingUp, Heart, MessageSquare, Award, Crown,
  Compass, Megaphone, UserCheck, Scale, Lightbulb, Bot, Camera,
  Pill, GraduationCap, Dumbbell, Flame, ShoppingCart, AlertTriangle,
  Moon, Sun, LogOut, ChevronRight, Search,
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

export default function AccordionSidebar({ categories, flatItems, collapsed, isProRole, onLinkClick, trackClick }: Props) {
  const location = useLocation();
  const { t } = useTranslation();
  const { openGroups, toggleGroup } = useSidebarGroups();

  // Regroup items from DB categories into new accordion groups
  const allItems = categories.flatMap((c) => c.items);

  // Extract fixed items (Ranking)
  const fixedItems = allItems.filter((item) => FIXED_ROUTES.includes(item.route));

  // Group remaining items
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
      {/* Ranking Global - Fixed at top with highlight */}
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

      {/* Accordion Groups */}
      {groups.map((group) => {
        const isOpen = openGroups.includes(group.name);
        const GroupIcon = GROUP_ICONS[group.name] || Settings;
        const hasActiveItem = group.items.some((item) => location.pathname === item.route);
        const colorClass = GROUP_COLORS[group.name] || "text-muted-foreground";

        return (
          <div key={group.name} className="mb-0.5">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-left group
                ${hasActiveItem ? "bg-primary/5" : "hover:bg-muted/50"}
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
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </>
              )}
              {collapsed && (
                <GroupIcon className={`w-4 h-4 ${colorClass} mx-auto`} />
              )}
            </button>

            {/* Group items */}
            <AnimatePresence initial={false}>
              {(isOpen || collapsed) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className={`space-y-0.5 ${collapsed ? "" : "pl-2 ml-2 border-l border-border/30"}`}>
                    {group.items.map((menuItem) => {
                      const Icon = getIcon(menuItem.icon);
                      const active = location.pathname === menuItem.route;
                      const isPremium = menuItem.premium_only;

                      return (
                        <Link
                          key={menuItem.id}
                          to={menuItem.route}
                          onClick={() => { trackClick(menuItem.id); onLinkClick?.(); }}
                          className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group/item
                            hover:translate-x-0.5
                            ${active
                              ? isPremium
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover/item:scale-110 ${
                            isPremium ? "text-amber-500" : active ? "text-primary" : ""
                          }`} />
                          {!collapsed && (
                            <span className={`text-xs font-medium truncate ${
                              isPremium ? "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-bold" : ""
                            }`}>
                              {t(menuItem.label_key, menuItem.label)}
                            </span>
                          )}
                          {active && !collapsed && (
                            <ChevronRight className={`w-3 h-3 ml-auto ${isPremium ? "text-amber-500" : "text-primary"}`} />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
