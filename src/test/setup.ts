import "@testing-library/jest-dom";
import { vi } from "vitest";

// Fix for Supabase client requiring localStorage in Node tests
if (typeof localStorage === "undefined") {
  const mockStorage: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    length: 0,
    key: (index: number) => Object.keys(mockStorage)[index] || null,
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock PWA virtual modules
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  })),
}));

// Mock experience hooks globally to avoid context errors in tests
vi.mock("@/hooks/useExperienceUI", () => ({
  useExperienceUI: () => ({
    mode: "pro",
    isBasic: false,
    isPro: true,
    isAdvanced: false,
    showMacros: true,
    showPlanStructure: true,
    showTechnicalDetails: false,
    showClinicalIntelligence: true,
    showTimeline: true,
    dashboardTitle: "Dashboard Pro",
    dashboardSubtitle: "Acompanhamento clínico e macros",
  }),
}));

vi.mock("@/hooks/useExperienceMode", () => ({
  useExperienceMode: () => ({
    mode: "pro",
    role: "patient",
    setMode: async () => {},
    isFeatureEnabled: () => true,
    minMode: () => true,
    isRouteAllowed: () => true,
    isBasic: false,
    isPro: true,
    isAdvanced: false,
    isLoading: false,
  }),
  checkFeaturePermission: () => true,
}));

vi.mock("@/providers/ExperienceProvider", () => ({
  useExperienceContext: () => ({
    mode: "pro",
    role: "patient",
    setMode: async () => {},
    isFeatureEnabled: () => true,
    minMode: () => true,
    isRouteAllowed: () => true,
    isBasic: false,
    isPro: true,
    isAdvanced: false,
    isLoading: false,
    failedMode: null,
    retryLastMode: () => {},
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { processed: 0, failed: 0, isFull: false, hasExpired: false },
  }),
  ExperienceProvider: ({ children }: any) => children,
}));

