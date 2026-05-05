import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWorkspace } from "./useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          single: vi.fn(),
          order: vi.fn(),
        })),
        in: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
      rpc: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/monitoring", () => ({
  logWarn: vi.fn(),
}));

describe("useWorkspace", () => {
  const mockUser = { id: "user-123" };
  const mockProfile = { id: "ws-123", user_id: "user-123" };
  const mockSections = [{ id: "sec-1", section_name: "Section 1", sort_order: 0 }];
  const mockItems = [{ id: "item-1", section_id: "sec-1", menu_item_id: "menu-1", sort_order: 0 }];
  const mockMenuItems = [{ id: "menu-1", label: "Label 1", route: "/route1" }];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      isNutritionist: true,
      isPersonal: false,
      isAdmin: false,
      roles: ["nutritionist"],
    });

    // Mock initial fetch chain
    const fromMock = supabase.from as any;
    fromMock.mockImplementation((table: string) => {
      if (table === "workspace_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            })),
          })),
        };
      }
      if (table === "workspace_sections") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: mockSections, error: null }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { ...mockSections[0], id: "sec-2", section_name: "New" }, error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        };
      }
      if (table === "workspace_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { ...mockItems[0], id: "item-2" }, error: null }),
            })),
          })),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        };
      }
      if (table === "menu_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: mockMenuItems, error: null }),
          })),
        };
      }
      return {};
    });
  });

  it("should initialize workspace data correctly", async () => {
    const { result } = renderHook(() => useWorkspace());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.sections).toHaveLength(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].label).toBe("Label 1");
  });

  it("should add a new section", async () => {
    const { result } = renderHook(() => useWorkspace());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addSection("New", "Icon", "Color");
    });

    expect(result.current.sections).toHaveLength(2);
    expect(result.current.sections[1].section_name).toBe("New");
  });

  it("should update a section", async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSection("sec-1", { section_name: "Updated" });
    });

    expect(result.current.sections[0].section_name).toBe("Updated");
  });

  it("should remove an item", async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeItem("item-1");
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("should reorder items within a section", async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Add another item locally for reordering test
    act(() => {
      (result.current as any).items.push({ id: "item-2", section_id: "sec-1", sort_order: 1 });
    });

    await act(async () => {
      await result.current.reorderItems("sec-1", ["item-2", "item-1"]);
    });

    const items = result.current.getItemsForSection("sec-1");
    expect(items[0].id).toBe("item-2");
    expect(items[0].sort_order).toBe(0);
  });
});
