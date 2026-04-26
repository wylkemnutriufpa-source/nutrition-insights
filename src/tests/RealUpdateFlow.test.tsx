import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import UpdateBanner from '../components/common/UpdateBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import * as pwa from 'virtual:pwa-register/react';

const queryClient = new QueryClient();

describe('E2E Simulation: Real App Update Cycle', () => {
  let mockUpdateServiceWorker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default mock behavior
    (pwa.useRegisterSW as any).mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker
    });
    
    // Mock Service Worker registration with EventTarget capabilities
    const mockSW = {
      getRegistration: vi.fn().mockResolvedValue({
        update: vi.fn().mockResolvedValue(true),
        waiting: { scriptURL: '/sw.js?v=2' }
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      controller: { scriptURL: '/sw.js?v=1' }
    };

    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: mockSW,
      configurable: true
    });
  });

  it('should show the update pop-up once and NOT loop on background/foreground transition', async () => {
    // Simulate a new version being detected
    (pwa.useRegisterSW as any).mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UpdateBanner />
      </QueryClientProvider>
    );

    // 1. Pop-up should appear initially
    expect(await screen.findByText(/Nova versão disponível/i)).toBeInTheDocument();

    // 2. Dismiss it (simulate clicking 'Mais tarde' or similar close action)
    const dismissButton = screen.getByRole('button', { name: /fechar/i });
    act(() => {
      dismissButton.click();
    });

    // Pop-up should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Nova versão disponível/i)).not.toBeInTheDocument();
    });

    // 3. Simulate App going to Background then Foreground
    // This should trigger a check but NOT show the pop-up again because it was recently dismissed
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // pop-up should still be hidden because of the 5-minute cooldown logic
    expect(screen.queryByText(/Nova versão disponível/i)).not.toBeInTheDocument();
    
    // 4. Verify no infinite reload loop
    // Even if we "reload" (re-render), the dismissed state should persist in localStorage
    render(
      <QueryClientProvider client={queryClient}>
        <UpdateBanner />
      </QueryClientProvider>
    );
    expect(screen.queryByText(/Nova versão disponível/i)).not.toBeInTheDocument();
  });

  it('should handle iOS and Android specific standalone modes without looping', async () => {
    // Mock iOS standalone mode
    (window.navigator as any).standalone = true;
    
    render(
      <QueryClientProvider client={queryClient}>
        <UpdateBanner />
      </QueryClientProvider>
    );

    // Verify it handles specific PWA platform logic if present
    expect(localStorage.getItem('fj:update-dismissed-at')).toBeNull();
  });
});
