const KEYBOARD_MODE_STORAGE_KEY = 'insight-keyboard-mode';

export type InsightKeyboardMode = 'virtual' | 'system';

export async function loadInsightKeyboardMode(): Promise<InsightKeyboardMode> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: KEYBOARD_MODE_STORAGE_KEY });
      return value === 'system' ? 'system' : 'virtual';
    }
  } catch {
    /* fall through to web */
  }
  if (typeof window === 'undefined') return 'virtual';
  const stored = window.localStorage.getItem(KEYBOARD_MODE_STORAGE_KEY);
  return stored === 'system' ? 'system' : 'virtual';
}

export async function persistInsightKeyboardMode(mode: InsightKeyboardMode): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: KEYBOARD_MODE_STORAGE_KEY, value: mode });
      return;
    }
  } catch {
    /* fall through */
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEYBOARD_MODE_STORAGE_KEY, mode);
  }
}

/** Best-effort: open iOS Settings for this app (not General > Keyboard). */
export async function openIOSAppSettings(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      const { App } = await import('@capacitor/app');
      await App.openUrl({ url: 'app-settings:' });
      return true;
    }
  } catch {
    /* unavailable */
  }
  return false;
}

export function getKeyboardSettingsInstructions(): string {
  return 'To change system keyboards, dictation, and other options, open Settings → General → Keyboard.';
}

export async function copyKeyboardSettingsInstructions(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(getKeyboardSettingsInstructions());
    return true;
  } catch {
    return false;
  }
}
