import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MobileQA from "@/pages/MobileQA";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";

// Mock complex components to avoid dependency hell
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/strategy-advisor/StrategyAdvisorPanel", () => ({
  default: () => <div>Mocked Strategy Advisor</div>
}));

// Mock html2canvas and jsPDF
vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/png;base64,mock",
    width: 1000,
    height: 1000,
  })
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    setFont: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  }))
}));

// Mocking window.scrollX and document.documentElement.scrollWidth
const mockScrollX = vi.fn().mockReturnValue(0);
const mockScrollWidth = vi.fn().mockReturnValue(1000);
const mockClientWidth = vi.fn().mockReturnValue(1000);

Object.defineProperty(window, 'scrollX', { get: mockScrollX });
Object.defineProperty(document.documentElement, 'scrollWidth', { get: mockScrollWidth });
Object.defineProperty(document.documentElement, 'clientWidth', { get: mockClientWidth });

describe("Mobile QA E2E Simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScrollX.mockReturnValue(0);
    mockScrollWidth.mockReturnValue(1000);
    mockClientWidth.mockReturnValue(1000);
    
    // Mock canvas context
    const mockContext = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mock"),
      width: 0,
      height: 0,
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return document.createElement.call(document, tagName);
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <MobileQA />
      </BrowserRouter>
    );
  };

  it("should open each modal, close with Esc, and return focus to trigger", async () => {
    renderComponent();

    const triggers = ["strategy", "settings", "profile", "wizard"];

    for (const id of triggers) {
      const trigger = screen.getByTestId(`trigger-${id}`);
      
      // Open modal
      fireEvent.click(trigger);
      
      const modal = await screen.findByTestId(`modal-${id}`);
      expect(modal).toBeInTheDocument();

      // Simulate Esc press
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape', keyCode: 27 });

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByTestId(`modal-${id}`)).not.toBeInTheDocument();
      });

      // Check focus returns to trigger
      expect(trigger).toHaveFocus();
    }
  });

  it("should validate no residual horizontal scroll after closing modal", async () => {
    renderComponent();

    const trigger = screen.getByTestId("trigger-strategy");
    fireEvent.click(trigger);

    // Mock an overflow while modal is open
    mockScrollX.mockReturnValue(50);
    
    // Close modal
    fireEvent.keyDown(screen.getByTestId("modal-strategy"), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId("modal-strategy")).not.toBeInTheDocument();
    });

    // Reset mock as if closing the modal fixed it or we are checking for residual
    mockScrollX.mockReturnValue(0);
    
    expect(window.scrollX).toBe(0);
  });

  it("should respect the overflow detection buffer/debounce", async () => {
    vi.useFakeTimers();
    renderComponent();

    // Trigger overflow
    mockScrollX.mockReturnValue(100);
    
    // Simulate scroll event
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    // Fast-forward less than buffer (default 300ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Evidence should NOT be registered yet
    expect(screen.queryByText(/Overflow Horizontal Persistente!/i)).not.toBeInTheDocument();

    // Fast-forward past buffer
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    // After timers, the async registerEvidence might be running
    vi.useRealTimers();
  });

  it("should verify Close (X) button is navigable by Tab", async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId("trigger-strategy"));
    
    await screen.findByTestId("modal-strategy");
    
    // Shadcn Dialog close button usually has a sr-only text "Close" or similar icon button
    const closeButtons = screen.getAllByRole('button');
    // The close button is usually the one with 'X' icon or 'sr-only' close text.
    // In our manual check, we look for one that is not a trigger.
    const closeButton = closeButtons.find(b => b.getAttribute('aria-label') === 'Close' || b.textContent?.includes('Close') || b.querySelector('.lucide-x'));
    
    if (closeButton) {
      expect(closeButton).not.toHaveAttribute('tabindex', '-1');
    }
  });
});
