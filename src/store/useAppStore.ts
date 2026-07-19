// Central Zustand store: settings, topic state, file state, UI state, and the
// ingestion pipeline (drag/drop + paste). Components subscribe to slices.

import { create } from 'zustand';
import type { FileInfo, Theme, ToastItem, TopicInfo } from '../types';
import * as fsApi from '../lib/fs';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/settings';
import { clipboardFileName, isValidTopicName, sanitizeTopicName } from '../lib/files';
import { errorMessage } from '../lib/errors';

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface AppState {
  // --- settings-derived ---
  workspaceRoot: string;
  theme: Theme;
  quickDropEnabled: boolean;
  quickDropTopicPath: string | null;

  // --- runtime ---
  hydrated: boolean;
  topics: TopicInfo[];
  currentTopicPath: string | null;
  files: FileInfo[];
  filesLoading: boolean;

  // --- ui ---
  newTopicDialogOpen: boolean;
  settingsOpen: boolean;
  deleteTopicDialogOpen: boolean;
  pendingDeleteTopic: TopicInfo | null;
  toasts: ToastItem[];

  // --- hydration + settings ---
  hydrate: () => Promise<void>;
  setWorkspaceRoot: (root: string) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;

  // --- topics ---
  refreshTopics: () => Promise<void>;
  selectTopic: (path: string | null) => Promise<void>;
  createTopic: (name: string) => Promise<void>;
  deleteFile: (fileName: string) => Promise<void>;
  deleteTopic: () => Promise<void>;

  // --- quick drop ---
  enableQuickDrop: (topicPath: string) => Promise<void>;
  disableQuickDrop: () => Promise<void>;

  // --- ingestion ---
  ingestFiles: (paths: string[]) => Promise<void>;
  ingestText: (text: string) => Promise<void>;
  ingestImage: (rgba: Uint8Array, width: number, height: number) => Promise<void>;

  // --- ui actions ---
  openNewTopicDialog: () => void;
  closeNewTopicDialog: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openDeleteTopicDialog: (topic: TopicInfo) => void;
  closeDeleteTopicDialog: () => void;
  addToast: (message: string, kind?: ToastItem['kind']) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  /** Where dropped/pasted material goes right now. */
  function targetTopicPath(): string | null {
    const s = get();
    if (s.quickDropEnabled && s.quickDropTopicPath) return s.quickDropTopicPath;
    return s.currentTopicPath;
  }

  async function refreshFilesOf(topicPath: string | null) {
    if (!topicPath) {
      set({ files: [] });
      return;
    }
    try {
      const files = await fsApi.listFiles(topicPath);
      // newest first
      files.sort((a, b) => b.modifiedAt - a.modifiedAt);
      set({ files });
    } catch (err) {
      set({ files: [] });
      get().addToast('Could not list files: ' + errorMessage(err), 'error');
    }
  }

  return {
    workspaceRoot: DEFAULT_SETTINGS.workspaceRoot,
    theme: DEFAULT_SETTINGS.theme,
    quickDropEnabled: DEFAULT_SETTINGS.quickDropEnabled,
    quickDropTopicPath: DEFAULT_SETTINGS.quickDropTopicPath,

    hydrated: false,
    topics: [],
    currentTopicPath: null,
    files: [],
    filesLoading: false,

    newTopicDialogOpen: false,
    settingsOpen: false,
    deleteTopicDialogOpen: false,
    pendingDeleteTopic: null,
    toasts: [],

    async hydrate() {
      try {
        const settings = await loadSettings();
        set({
          workspaceRoot: settings.workspaceRoot,
          theme: settings.theme,
          quickDropEnabled: settings.quickDropEnabled,
          quickDropTopicPath: settings.quickDropTopicPath,
        });
        await fsApi.ensureWorkspace(settings.workspaceRoot);
        await get().refreshTopics();
      } catch (err) {
        get().addToast('Initialization failed: ' + errorMessage(err), 'error');
      } finally {
        set({ hydrated: true });
      }
    },

    async setWorkspaceRoot(root) {
      set({ workspaceRoot: root });
      await saveSettings({ workspaceRoot: root });
      try {
        await fsApi.ensureWorkspace(root);
        await get().refreshTopics();
        set({ currentTopicPath: null, files: [] });
        get().addToast('Workspace set', 'success');
      } catch (err) {
        get().addToast('Could not set workspace: ' + errorMessage(err), 'error');
      }
    },

    async setTheme(theme) {
      set({ theme });
      await saveSettings({ theme });
    },

    async refreshTopics() {
      const { workspaceRoot } = get();
      try {
        const topics = await fsApi.listTopics(workspaceRoot);
        topics.sort((a, b) => b.createdAt - a.createdAt);
        set({ topics });
        const cur = get().currentTopicPath;
        if (cur && !topics.some((t) => t.path === cur)) {
          set({ currentTopicPath: null, files: [] });
        }
        // Release a stale Quick Drop lock if its target topic vanished
        // externally, so a later drop can't silently resurrect the folder.
        const qd = get().quickDropTopicPath;
        if (qd && !topics.some((t) => t.path === qd)) {
          set({ quickDropEnabled: false, quickDropTopicPath: null });
          await saveSettings({ quickDropEnabled: false, quickDropTopicPath: null });
        }
      } catch (err) {
        set({ topics: [] });
        get().addToast('Could not read topics: ' + errorMessage(err), 'error');
      }
    },

    async selectTopic(path) {
      set({ currentTopicPath: path, filesLoading: true });
      await refreshFilesOf(path);
      set({ filesLoading: false });
    },

    async createTopic(name) {
      if (!isValidTopicName(name)) {
        get().addToast('Enter a valid topic name', 'error');
        return;
      }
      const clean = sanitizeTopicName(name);
      const { workspaceRoot } = get();
      try {
        const path = await fsApi.createTopic(workspaceRoot, clean);
        await get().refreshTopics();
        await get().selectTopic(path);
        set({ newTopicDialogOpen: false });
        get().addToast(`Topic "${clean}" created`, 'success');
      } catch (err) {
        get().addToast('Could not create topic: ' + errorMessage(err), 'error');
      }
    },

    async deleteFile(fileName) {
      const { currentTopicPath } = get();
      if (!currentTopicPath) return;
      try {
        await fsApi.deleteFile(currentTopicPath, fileName);
        await refreshFilesOf(currentTopicPath);
        get().addToast('Deleted 1 file', 'success');
      } catch (err) {
        get().addToast('Could not delete file: ' + errorMessage(err), 'error');
      }
    },

    async deleteTopic() {
      const topic = get().pendingDeleteTopic;
      if (!topic) return;
      const { workspaceRoot } = get();
      try {
        await fsApi.deleteTopic(workspaceRoot, topic.path);
        await get().refreshTopics();
        // refreshTopics already clears a stale currentTopicPath and any stale
        // Quick Drop lock whose target vanished. If the active topic was the
        // one deleted, surface the most recent remaining topic instead of an
        // empty workspace.
        if (get().currentTopicPath === null) {
          await get().selectTopic(get().topics[0]?.path ?? null);
        }
        set({ pendingDeleteTopic: null, deleteTopicDialogOpen: false });
        get().addToast(`Topic "${topic.name}" deleted`, 'success');
      } catch (err) {
        get().addToast('Could not delete topic: ' + errorMessage(err), 'error');
        set({ pendingDeleteTopic: null, deleteTopicDialogOpen: false });
      }
    },

    async enableQuickDrop(topicPath) {
      set({ quickDropEnabled: true, quickDropTopicPath: topicPath });
      await saveSettings({ quickDropEnabled: true, quickDropTopicPath: topicPath });
    },

    async disableQuickDrop() {
      set({ quickDropEnabled: false });
      await saveSettings({ quickDropEnabled: false });
    },

    async ingestFiles(paths) {
      const target = targetTopicPath();
      if (!target) {
        get().addToast('Select or lock a topic first', 'error');
        return;
      }
      let ok = 0;
      let fail = 0;
      for (const src of paths) {
        try {
          await fsApi.copyFileIntoTopic(src, target);
          ok++;
        } catch (err) {
          fail++;
          const name = src.split(/[\\/]/).pop() || src;
          get().addToast('Could not collect ' + name + ': ' + errorMessage(err), 'error');
        }
      }
      await refreshFilesOf(get().currentTopicPath);
      if (ok > 0) {
        get().addToast(
          `Collected ${ok} item${ok > 1 ? 's' : ''}${fail ? `, ${fail} failed` : ''}`,
          'success',
        );
      }
    },

    async ingestText(text) {
      const target = targetTopicPath();
      if (!target) {
        get().addToast('Select or lock a topic first', 'error');
        return;
      }
      const filename = clipboardFileName('md');
      try {
        await fsApi.saveTextFile(target, filename, text);
        await refreshFilesOf(get().currentTopicPath);
        get().addToast(`Saved ${filename}`, 'success');
      } catch (err) {
        get().addToast('Paste failed: ' + errorMessage(err), 'error');
      }
    },

    async ingestImage(rgba, width, height) {
      const target = targetTopicPath();
      if (!target) {
        get().addToast('Select or lock a topic first', 'error');
        return;
      }
      const filename = clipboardFileName('png');
      try {
        await fsApi.saveImageFile(target, filename, rgba, width, height);
        await refreshFilesOf(get().currentTopicPath);
        get().addToast(`Saved ${filename}`, 'success');
      } catch (err) {
        get().addToast('Image paste failed: ' + errorMessage(err), 'error');
      }
    },

    openNewTopicDialog: () => set({ newTopicDialogOpen: true }),
    closeNewTopicDialog: () => set({ newTopicDialogOpen: false }),
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    openDeleteTopicDialog: (topic) => set({ deleteTopicDialogOpen: true, pendingDeleteTopic: topic }),
    closeDeleteTopicDialog: () => set({ deleteTopicDialogOpen: false, pendingDeleteTopic: null }),

    addToast(message, kind = 'info') {
      const id = uid();
      set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
      setTimeout(() => get().removeToast(id), 4000);
    },
    removeToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
  };
});
