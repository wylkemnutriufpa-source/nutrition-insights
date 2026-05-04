import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

export interface MenuItem {
  id: string;
  label: string;
  label_key: string;
  route: string;
  icon: string;
  category: string;
  order_default: number;
  role_visibility: string[];
  premium_only: boolean;
  is_active: boolean;
  icon_color: string | null;
  color: string | null;
  premium_priority_boost: boolean;
  feature?: string;
}

interface MenuUsage {
  menu_item_id: string;
  clicks_count: number;
  last_access_at: string;
  usage_score: number;
}

export interface SmartMenuItem extends MenuItem {
  usage_score: number;
  computed_order: number;
}

export interface MenuCategory {
  category: string;
  items: SmartMenuItem[];
}

const DEFAULT_ROLE_VISIBILITY = ["admin", "nutritionist", "personal", "patient"];

function normalizeRoleVisibility(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_ROLE_VISIBILITY;
  const roles = value.filter((role): role is string => typeof role === "string" && role.length > 0);
  return roles.length ? roles : DEFAULT_ROLE_VISIBILITY;
}

function normalizeMenuItem(raw: any): MenuItem | null {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const label = typeof raw.label === "string" && raw.label ? raw.label : null;
  const route = typeof raw.route === "string" && raw.route ? raw.route : null;

  if (!id || !label || !route) return null;

  return {
    id,
    label,
    label_key: typeof raw.label_key === "string" && raw.label_key ? raw.label_key : label,
    route,
    icon: typeof raw.icon === "string" && raw.icon ? raw.icon : "LayoutDashboard",
    category: typeof raw.category === "string" && raw.category ? raw.category : "PRINCIPAL",
    order_default: typeof raw.order_default === "number" ? raw.order_default : 999,
    role_visibility: normalizeRoleVisibility(raw.role_visibility),
    premium_only: Boolean(raw.premium_only),
    is_active: raw.is_active !== false,
    icon_color: typeof raw.icon_color === "string" ? raw.icon_color : null,
    color: typeof raw.color === "string" ? raw.color : null,
    premium_priority_boost: Boolean(raw.premium_priority_boost),
    feature: typeof raw.feature === "string" ? raw.feature : undefined,
  };
}

const CACHE_KEY = "fitjourney_menu_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedMenu(): { items: MenuItem[]; usage: MenuUsage[]; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedMenu(items: MenuItem[], usage: MenuUsage[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items, usage, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function invalidateMenuCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

// Category display order
const CATEGORY_ORDER: Record<string, number> = {
  ADMIN: 0,
  PERSONAL: 1,
  PRINCIPAL: 2,
  CLÍNICO: 3,
  NUTRIÇÃO: 4,
  ANALYTICS: 5,
  MARKETING: 6,
  PERFORMANCE: 7,
  FERRAMENTAS: 8,
  CONTEÚDO: 9,
};

// Category display labels
export const CATEGORY_LABELS: Record<string, string> = {
  ADMIN: "Administração",
  PERSONAL: "Personal Trainer",
  PRINCIPAL: "Principal",
  CLÍNICO: "Clínico",
  NUTRIÇÃO: "Nutrição",
  ANALYTICS: "Analytics",
  MARKETING: "Marketing",
  PERFORMANCE: "Performance",
  FERRAMENTAS: "Ferramentas",
  CONTEÚDO: "Conteúdo",
};

// Category colors for sidebar section headers
export const CATEGORY_COLORS: Record<string, string> = {
  ADMIN: "text-red-400",
  PERSONAL: "text-orange-400",
  PRINCIPAL: "text-emerald-400",
  CLÍNICO: "text-sky-400",
  NUTRIÇÃO: "text-violet-400",
  ANALYTICS: "text-cyan-400",
  MARKETING: "text-amber-500",
  PERFORMANCE: "text-pink-400",
  FERRAMENTAS: "text-indigo-400",
  CONTEÚDO: "text-rose-400",
};

export function useSmartMenu() {
  const { user, roles } = useAuth();
  const { isPatientContext, isHybridUser } = useWorkspaceContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [usage, setUsage] = useState<MenuUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const trackingRef = useRef(false);

  // Determine user's auth role
  const authRole = useMemo(() => {
    if ((roles as string[]).includes("admin")) return "admin";
    if (roles.includes("nutritionist")) return "nutritionist";
    if (roles.includes("personal")) return "personal";
    if (roles.includes("patient")) return "patient";
    return "patient";
  }, [roles]);

  // For hybrid users, switch effective role based on workspace context
  // In patient context → filter as "patient"; in professional context → use auth role
  const userRole = useMemo(() => {
    if (isHybridUser && isPatientContext) return "patient";
    return authRole;
  }, [authRole, isHybridUser, isPatientContext]);

  // Fetch menu items + usage
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const cached = getCachedMenu();
    if (cached) {
      setMenuItems(cached.items);
      setUsage(cached.usage);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [itemsRes, usageRes] = await Promise.all([
          supabase.from("menu_items").select("*").eq("is_active", true).order("order_default"),
          supabase.from("user_menu_usage").select("menu_item_id,clicks_count,last_access_at,usage_score").eq("user_id", user.id),
        ]);

        const items = ((itemsRes.data || []) as unknown[])
          .map((item) => normalizeMenuItem(item))
          .filter((item): item is MenuItem => item !== null);
        const usageData = (usageRes.data || []) as unknown as MenuUsage[];

        setMenuItems(items);
        setUsage(usageData);
        setCachedMenu(items, usageData);
      } catch (e) {
        console.error("Error fetching smart menu:", e);
        setMenuItems([]);
        setUsage([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter by role and compute smart ordering
  const categories = useMemo<MenuCategory[]>(() => {
    if (!menuItems.length) return [];

    // Filter items visible to this role
    const visible = menuItems.filter((item) =>
      Array.isArray(item.role_visibility) && item.role_visibility.includes(userRole)
    );

    // Build usage map
    const usageMap = new Map<string, MenuUsage>();
    usage.forEach((u) => usageMap.set(u.menu_item_id, u));

    // Enrich with scores
    const enriched: SmartMenuItem[] = visible.map((item) => {
      const u = usageMap.get(item.id);
      const score = u?.usage_score || 0;
      // Compute order: within category, higher score = lower order number (comes first)
      // If no usage, fall back to order_default
      const computed_order = score > 0 ? -score : item.order_default;
      return { ...item, usage_score: score, computed_order };
    });

    // Group by category
    const grouped = new Map<string, SmartMenuItem[]>();
    enriched.forEach((item) => {
      const existing = grouped.get(item.category) || [];
      existing.push(item);
      grouped.set(item.category, existing);
    });

    // Sort items within each category
    grouped.forEach((items) => {
      items.sort((a, b) => a.computed_order - b.computed_order);
    });

    // Sort categories by predefined order
    const result: MenuCategory[] = [];
    const sortedCategories = Array.from(grouped.entries()).sort(
      ([a], [b]) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99)
    );

    for (const [category, items] of sortedCategories) {
      if (items.length > 0) {
        result.push({ category, items });
      }
    }

    return result;
  }, [menuItems, usage, userRole]);

  // Track a click - fire and forget, invalidate cache
  const trackClick = useCallback(
    async (menuItemId: string) => {
      if (!user || trackingRef.current) return;
      trackingRef.current = true;

      try {
        await supabase.rpc("track_menu_click", { _menu_item_id: menuItemId } as any);

        // Update local usage optimistically
        setUsage((prev) => {
          const idx = prev.findIndex((u) => u.menu_item_id === menuItemId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              clicks_count: updated[idx].clicks_count + 1,
              last_access_at: new Date().toISOString(),
              usage_score: updated[idx].usage_score + 0.6,
            };
            return updated;
          }
          return [
            ...prev,
            { menu_item_id: menuItemId, clicks_count: 1, last_access_at: new Date().toISOString(), usage_score: 0.6 },
          ];
        });

        invalidateMenuCache();
      } catch (e) {
        console.error("Error tracking menu click:", e);
      } finally {
        trackingRef.current = false;
      }
    },
    [user]
  );

  // Get flat list for patient view (no sections)
  const flatItems = useMemo(() => {
    return categories.flatMap((c) => c.items);
  }, [categories]);

  return { categories, flatItems, loading, trackClick, userRole };
}
