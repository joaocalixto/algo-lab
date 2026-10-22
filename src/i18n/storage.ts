const STORAGE_KEY = 'algo-lab.locale';

// Storage can throw (private mode, blocked site data); preference is a convenience only.
export function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLocale(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore: the app works without persistence.
  }
}
