import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncStatus } from "../useSyncStatus";

// Mock fjLog
vi.mock("@/utils/dataSafety", () => ({
  fjLog: vi.fn(),
  FJ_LOG_TAGS: {
    CRITICAL: "[FJ:CRITICAL]",
    SYNC: "[FJ:SYNC]"
  }
}));

describe("useSyncStatus Hook - Synchronization Failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles syncing state correctly", () => {
    const { result } = renderHook(() => useSyncStatus());
    
    act(() => {
      result.current.updateStatus("syncing", "test_action");
    });

    expect(result.current.status).toBe("syncing");
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.errorMessage).toBe(null);
  });

  it("handles error state and exposes message", () => {
    const { result } = renderHook(() => useSyncStatus());
    const errorMsg = "Network timeout";
    
    act(() => {
      result.current.updateStatus("error", "test_action", { message: errorMsg });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe(errorMsg);
  });

  it("recovers from error to success", () => {
    const { result } = renderHook(() => useSyncStatus());
    
    // Fail first
    act(() => {
      result.current.updateStatus("error", "test_action", "Initial failure");
    });
    expect(result.current.isError).toBe(true);

    // Sync again
    act(() => {
      result.current.updateStatus("syncing", "test_action");
    });
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.errorMessage).toBe(null);

    // Succeed
    act(() => {
      result.current.updateStatus("success", "test_action");
    });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.lastAction?.type).toBe("test_action");
  });
});
