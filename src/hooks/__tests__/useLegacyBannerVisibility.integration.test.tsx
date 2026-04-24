/**
 * Testes de integração para a persistência do banner legado:
 * - `?legacyBanner=0|1` na URL é respeitado na primeira renderização
 * - localStorage sobrevive a "recargas" (re-mount do hook)
 * - Eventos `storage` (cross-tab) atualizam estado em tempo real
 *
 * Mantemos o foco no hook `useLegacyBannerVisibility` para isolar
 * o comportamento da persistência sem montar componentes pesados.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLegacyBannerVisibility } from "@/hooks/useForceCanonicalDay";

const STORAGE_KEY = "fj_editor_legacy_banner_dismissed";

function setUrl(search: string) {
  // jsdom exige mesma origin/path no replaceState; usamos caminho relativo.
  const path = "/" + (search.startsWith("?") || search === "" ? search : `?${search}`);
  window.history.replaceState({}, "", path);
}

beforeEach(() => {
  window.localStorage.clear();
  setUrl("");
});

afterEach(() => {
  window.localStorage.clear();
  setUrl("");
});

describe("useLegacyBannerVisibility — query param ?legacyBanner=0|1", () => {
  it("?legacyBanner=0 oculta banner na primeira render", () => {
    setUrl("?legacyBanner=0");
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(false);
  });

  it("?legacyBanner=1 mantém visível", () => {
    setUrl("?legacyBanner=1");
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(true);
  });

  it("ausência do param: default = visível", () => {
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(true);
  });

  it("query param tem precedência sobre localStorage", () => {
    // localStorage diz "dismissed=true" (oculto), mas URL força visível
    window.localStorage.setItem(STORAGE_KEY, "true");
    setUrl("?legacyBanner=1");
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(true);
  });
});

describe("useLegacyBannerVisibility — localStorage persiste ao recarregar", () => {
  it("dismissed via setVisible(false) persiste em localStorage e sobrevive ao re-mount", () => {
    const first = renderHook(() => useLegacyBannerVisibility());
    expect(first.result.current[0]).toBe(true);

    act(() => first.result.current[1](false));
    expect(first.result.current[0]).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true"); // dismissed=true

    first.unmount();

    // Simula reload: novo render, sem query param
    setUrl("");
    const second = renderHook(() => useLegacyBannerVisibility());
    expect(second.result.current[0]).toBe(false);
  });

  it("setVisible(true) limpa o flag dismissed e persiste como visível", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { result, unmount } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");

    unmount();
    setUrl("");
    const second = renderHook(() => useLegacyBannerVisibility());
    expect(second.result.current[0]).toBe(true);
  });

  it("setVisible também sincroniza ?legacyBanner na URL", () => {
    const { result } = renderHook(() => useLegacyBannerVisibility());
    act(() => result.current[1](false));
    expect(window.location.search).toContain("legacyBanner=0");

    act(() => result.current[1](true));
    expect(window.location.search).toContain("legacyBanner=1");
  });
});

describe("useLegacyBannerVisibility — cross-tab via storage event", () => {
  it("evento 'storage' com dismissed=true oculta o banner em outras abas", () => {
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(true);

    act(() => {
      // Simula outra aba marcando dismissed=true
      window.localStorage.setItem(STORAGE_KEY, "true");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "true",
          oldValue: null,
          storageArea: window.localStorage,
        })
      );
    });

    expect(result.current[0]).toBe(false);
  });

  it("evento 'storage' com dismissed=false torna o banner visível novamente", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(false);

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, "false");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "false",
          oldValue: "true",
          storageArea: window.localStorage,
        })
      );
    });

    expect(result.current[0]).toBe(true);
  });

  it("eventos 'storage' de outras chaves NÃO afetam o estado", () => {
    const { result } = renderHook(() => useLegacyBannerVisibility());
    expect(result.current[0]).toBe(true);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "outra_chave_qualquer",
          newValue: "true",
          oldValue: null,
          storageArea: window.localStorage,
        })
      );
    });

    expect(result.current[0]).toBe(true);
  });
});
