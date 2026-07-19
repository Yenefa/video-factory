// Shared domain types for Raw Material Collector.

export interface TopicInfo {
  /** Display name (also the folder name). */
  name: string;
  /** Absolute path to the topic folder. */
  path: string;
  /** Folder creation time, ms since epoch. */
  createdAt: number;
}

export interface FileInfo {
  name: string;
  /** Absolute path to the file. */
  path: string;
  /** Size in bytes. */
  size: number;
  /** Modified time, ms since epoch. */
  modifiedAt: number;
  /** Whether this entry is a directory. */
  isDir: boolean;
}

export type Theme = 'light' | 'dark' | 'system';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}
