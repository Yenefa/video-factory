// Persisted application settings, stored via tauri-plugin-store in AppData.

import { Store } from '@tauri-apps/plugin-store';
import type { Theme } from '../types';

const STORE_FILE = 'settings.json';

export interface AppSettings {
  /** Absolute path to the materials workspace root. */
  workspaceRoot: string;
  theme: Theme;
  quickDropEnabled: boolean;
  /** Topic path locked as the drop target while Quick Drop is on. */
  quickDropTopicPath: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  workspaceRoot: 'D:\\raw app\\RawMaterialCollector',
  theme: 'system',
  quickDropEnabled: false,
  quickDropTopicPath: null,
};

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load(STORE_FILE);
  return storePromise;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const store = await getStore();
    const workspaceRoot =
      (await store.get<string>('workspaceRoot')) ?? DEFAULT_SETTINGS.workspaceRoot;
    const theme = (await store.get<Theme>('theme')) ?? DEFAULT_SETTINGS.theme;
    const quickDropEnabled =
      (await store.get<boolean>('quickDropEnabled')) ?? DEFAULT_SETTINGS.quickDropEnabled;
    const quickDropTopicPath =
      (await store.get<string | null>('quickDropTopicPath')) ?? DEFAULT_SETTINGS.quickDropTopicPath;
    return { workspaceRoot, theme, quickDropEnabled, quickDropTopicPath };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  try {
    const store = await getStore();
    for (const [key, value] of Object.entries(patch)) {
      await store.set(key, value);
    }
    await store.save();
  } catch {
    // Settings persistence is best-effort; the in-memory store still works.
  }
}
