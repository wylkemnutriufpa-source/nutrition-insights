import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Database } from "@/integrations/supabase/types";

type WorkspaceProfileRow = Database["public"]["Tables"]["workspace_profiles"]["Row"];
type WorkspaceSectionRow = Database["public"]["Tables"]["workspace_sections"]["Row"];
type WorkspaceItemRow = Database["public"]["Tables"]["workspace_items"]["Row"];

export interface WorkspaceSection extends WorkspaceSectionRow {}

export interface WorkspaceItem extends WorkspaceItemRow {
  // Joined from menu_items
  label?: string;
  label_key?: string;
  route?: string;
  icon?: string;
  premium_only?: boolean;
  feature?: string;
  role_visibility?: string[];
}

export interface WorkspaceProfile extends WorkspaceProfileRow {}

export function useWorkspace() {
  const { user, isNutritionist, isPersonal, isAdmin, roles } = useAuth();
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [sections, setSections] = useState<WorkspaceSection[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isProRole = isNutritionist || isPersonal || isAdmin;

  // Determine the user's primary role for filtering
  const userRole = useMemo(() => {
    if ((roles as string[]).includes("admin")) return "admin";
    if (roles.includes("nutritionist")) return "nutritionist";
    if (roles.includes("personal")) return "personal";
    return "patient";
  }, [roles]);

  const initialize = useCallback(async () => {
    if (!user?.id || !isProRole) { setLoading(false); return; }

    try {
      // Try to get existing workspace
      const { data: existing } = await supabase
        .from("workspace_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let workspaceId: string;

      if (existing) {
        setProfile(existing as any);
        workspaceId = (existing as any).id;
      } else {
        // Initialize default workspace via RPC
        const { data: newId } = await supabase.rpc("initialize_default_workspace", {
          _user_id: user.id,
        } as any);
        workspaceId = newId as string;

        const { data: newProfile } = await supabase
          .from("workspace_profiles" as any)
          .select("*")
          .eq("id", workspaceId)
          .single();
        setProfile(newProfile as any);
      }

      // Fetch sections
      const { data: secs } = await supabase
        .from("workspace_sections" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");

      setSections((secs || []) as any);

      // Fetch items with menu_items join
      const { data: rawItems } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");

      // Now enrich with menu_items data
      const menuItemIds = ((rawItems || []) as any[]).map((i: any) => i.menu_item_id);
      let menuMap = new Map<string, any>();

      if (menuItemIds.length > 0) {
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("id, label, label_key, route, icon, premium_only, feature, role_visibility")
          .in("id", menuItemIds);

        (menuData || []).forEach((m: any) => menuMap.set(m.id, m));
      }

      const enriched = ((rawItems || []) as any[]).map((item: any) => {
        const menu = menuMap.get(item.menu_item_id);
        return {
          ...item,
          label: menu?.label || "Item",
          label_key: menu?.label_key || "",
          route: menu?.route || "/",
          icon: menu?.icon || "LayoutDashboard",
          premium_only: menu?.premium_only || false,
          feature: menu?.feature || undefined,
          role_visibility: Array.isArray(menu?.role_visibility) ? menu.role_visibility : [],
        };
      });

      setItems(enriched);
    } catch (e) {
      console.error("Workspace init error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isProRole]);

  useEffect(() => { initialize(); }, [initialize]);

  // Section CRUD
  const addSection = useCallback(async (name: string, icon: string, color: string) => {
    if (!profile) return;
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), -1);
    const { data } = await supabase
      .from("workspace_sections" as any)
      .insert({ workspace_id: profile.id, section_name: name, section_icon: icon, section_color: color, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (data) setSections(prev => [...prev, data as any]);
  }, [profile, sections]);

  const updateSection = useCallback(async (id: string, updates: Partial<WorkspaceSection>) => {
    await supabase.from("workspace_sections" as any).update(updates).eq("id", id);
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    await supabase.from("workspace_sections" as any).delete().eq("id", id);
    setSections(prev => prev.filter(s => s.id !== id));
    setItems(prev => prev.filter(i => i.section_id !== id));
  }, []);

  const reorderSections = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("workspace_sections" as any).update({ sort_order: u.sort_order }).eq("id", u.id);
    }
    setSections(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, sort_order: i }));
    });
  }, []);

  // Item CRUD
  const moveItem = useCallback(async (itemId: string, toSectionId: string, newOrder: number) => {
    await supabase.from("workspace_items" as any).update({ section_id: toSectionId, sort_order: newOrder }).eq("id", itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, section_id: toSectionId, sort_order: newOrder } : i));
  }, []);

  const toggleItemVisibility = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newVis = !item.is_visible;
    await supabase.from("workspace_items" as any).update({ is_visible: newVis }).eq("id", itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_visible: newVis } : i));
  }, [items]);

  const togglePin = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newPin = !item.is_pinned;
    await supabase.from("workspace_items" as any).update({ is_pinned: newPin }).eq("id", itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_pinned: newPin } : i));
  }, [items]);

  const addItem = useCallback(async (sectionId: string, menuItemId: string, menuData: { label: string; label_key: string; route: string; icon: string; premium_only: boolean }) => {
    if (!profile) return;
    // Check if already exists
    if (items.some(i => i.menu_item_id === menuItemId)) {
      return;
    }
    const maxOrder = items.filter(i => i.section_id === sectionId).reduce((m, i) => Math.max(m, i.sort_order), -1);
    const { data } = await supabase
      .from("workspace_items" as any)
      .insert({ workspace_id: profile.id, section_id: sectionId, menu_item_id: menuItemId, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (data) {
      setItems(prev => [...prev, { ...(data as any), ...menuData }]);
    }
  }, [profile, items]);

  const removeItem = useCallback(async (itemId: string) => {
    await supabase.from("workspace_items" as any).delete().eq("id", itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const reorderItems = useCallback(async (sectionId: string, orderedItemIds: string[]) => {
    for (let i = 0; i < orderedItemIds.length; i++) {
      await supabase.from("workspace_items" as any).update({ sort_order: i }).eq("id", orderedItemIds[i]);
    }
    setItems(prev => {
      const updated = [...prev];
      orderedItemIds.forEach((id, idx) => {
        const item = updated.find(i => i.id === id);
        if (item) item.sort_order = idx;
      });
      return updated;
    });
  }, []);

  const resetToDefault = useCallback(async () => {
    if (!profile || !user?.id) return;
    // Delete everything and reinitialize
    await supabase.from("workspace_items" as any).delete().eq("workspace_id", profile.id);
    await supabase.from("workspace_sections" as any).delete().eq("workspace_id", profile.id);
    await supabase.from("workspace_profiles" as any).delete().eq("id", profile.id);
    setProfile(null);
    setSections([]);
    setItems([]);
    setLoading(true);
    await initialize();
  }, [profile, user?.id, initialize]);

  // Get items for a specific section, sorted and filtered by role
  const getItemsForSection = useCallback((sectionId: string) => {
    return items
      .filter(i => i.section_id === sectionId)
      .filter(i => {
        const rv = (i as any).role_visibility;
        // If no role_visibility defined, show to everyone
        if (!Array.isArray(rv) || rv.length === 0) return true;
        return rv.includes(userRole);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [items, userRole]);

  return {
    profile, sections, items, loading,
    addSection, updateSection, deleteSection, reorderSections,
    moveItem, toggleItemVisibility, togglePin, reorderItems, addItem, removeItem,
    getItemsForSection, resetToDefault, refresh: initialize,
  };
}
