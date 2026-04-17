const DISMISS_KEY = "fj:update-dismissed-at";
const DISMISS_VERSION_KEY = "fj:update-dismissed-version";
const SW_BOOT_KEY = "fj:sw-boot-ts";

export const DISMISS_COOLDOWN_MS = 5 * 60 * 1000;
export const SW_BOOT_GRACE_MS = 15 * 1000;

export async function clearRuntimeCaches() {
  const tasks: Promise<unknown>[] = [];

  if ("caches" in window) {
    tasks.push(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }

  const queryClient = (window as any).__REACT_QUERY_CLIENT__;
  if (queryClient?.clear) {
    tasks.push(Promise.resolve(queryClient.clear()));
  }

  await Promise.allSettled(tasks);
}

export function forceHardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", String(Date.now()));
  window.location.replace(url.toString());
}

function normalizeVersionToken(versionToken?: string | null) {
  if (!versionToken) return null;

  try {
    return new URL(versionToken, window.location.origin).toString();
  } catch {
    return versionToken;
  }
}

export function wasDismissedRecently(versionToken?: string | null): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;

    const normalizedToken = normalizeVersionToken(versionToken);
    const dismissedVersion = normalizeVersionToken(localStorage.getItem(DISMISS_VERSION_KEY));

    if (normalizedToken && dismissedVersion && dismissedVersion !== normalizedToken) {
      return false;
    }

    return Date.now() - Number(ts) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markDismissed(versionToken?: string | null) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));

    const normalizedToken = normalizeVersionToken(versionToken);
    if (normalizedToken) {
      localStorage.setItem(DISMISS_VERSION_KEY, normalizedToken);
    } else {
      localStorage.removeItem(DISMISS_VERSION_KEY);
    }
  } catch {}
}

export function markBoot() {
  try {
    sessionStorage.setItem(SW_BOOT_KEY, String(Date.now()));
  } catch {}
}

export function isWithinBootGrace(): boolean {
  try {
    const ts = sessionStorage.getItem(SW_BOOT_KEY);
    if (!ts) return true;
    return Date.now() - Number(ts) < SW_BOOT_GRACE_MS;
  } catch {
    return false;
  }
}

export function getServiceWorkerVersionToken(worker?: ServiceWorker | null, fallbackUrl?: string | null) {
  return normalizeVersionToken(worker?.scriptURL ?? fallbackUrl ?? null);
}

export function isIosStandalone() {
  const ua = navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(ua);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  return isAppleMobile && standalone;
}