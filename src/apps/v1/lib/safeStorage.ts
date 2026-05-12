/**
 * 🛡️ Safe Storage Wrapper
 * 
 * Em alguns ambientes de navegação privada ou restritos, o acesso a localStorage/sessionStorage
 * pode lançar "SecurityError" ou "QuotaExceededError".
 */

const isStorageAvailable = (type: 'localStorage' | 'sessionStorage') => {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
};

const lAvailable = isStorageAvailable('localStorage');
const sAvailable = isStorageAvailable('sessionStorage');

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!lAvailable) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!lAvailable) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[SafeStorage] Failed to set localStorage item:', e);
    }
  },
  removeItem: (key: string): void => {
    if (!lAvailable) return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  clear: (): void => {
    if (!lAvailable) return;
    try {
      localStorage.clear();
    } catch {}
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!sAvailable) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!sAvailable) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('[SafeStorage] Failed to set sessionStorage item:', e);
    }
  },
  removeItem: (key: string): void => {
    if (!sAvailable) return;
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },
  clear: (): void => {
    if (!sAvailable) return;
    try {
      sessionStorage.clear();
    } catch {}
  }
};
