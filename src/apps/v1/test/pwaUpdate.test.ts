import { describe, expect, it, beforeEach, vi } from "vitest";
import { getServiceWorkerVersionToken, wasDismissedRecently, markDismissed } from "@v1/lib/pwaUpdate";

describe("pwaUpdate", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("dismissal expires immediately for a different service worker version", () => {
    markDismissed("/sw-old.js");
    expect(wasDismissedRecently("/sw-old.js")).toBe(true);
    expect(wasDismissedRecently("/sw-new.js")).toBe(false);
  });

  it("normalizes service worker URLs before comparing versions", () => {
    expect(getServiceWorkerVersionToken({ scriptURL: "/sw.js" } as ServiceWorker)).toContain("/sw.js");
  });
});